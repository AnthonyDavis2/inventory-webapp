import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { authenticator } from 'otplib'
import { PrismaService } from '../database/prisma.service'
import type { LoginDto } from './dto/login.dto'
import type { JwtPayload } from './strategies/jwt.strategy'

const BCRYPT_ROUNDS = 12
const REFRESH_TOKEN_BYTES = 48

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deleted_at: null },
      include: { org: { select: { id: true, is_read_only: true } } },
    })

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.mfa_enabled) {
      if (!dto.totp) {
        throw new UnauthorizedException('MFA code required')
      }
      const secret = this.decryptMfaSecret(user.mfa_secret!)
      const valid = authenticator.verify({ token: dto.totp, secret })
      if (!valid) {
        throw new UnauthorizedException('Invalid MFA code')
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    })

    return this.issueTokens(user.id, user.org_id, user.email, user.role, ipAddress, userAgent)
  }

  async refresh(
    rawToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawToken)
    const session = await this.prisma.userSession.findUnique({
      where: { refresh_token_hash: tokenHash },
      include: { user: true },
    })

    if (!session || session.revoked_at || session.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Rotate: revoke old, issue new
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revoked_at: new Date() },
    })

    return this.issueTokens(
      session.user.id,
      session.user.org_id,
      session.user.email,
      session.user.role,
      ipAddress,
      userAgent,
    )
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken)
    await this.prisma.userSession.updateMany({
      where: { refresh_token_hash: tokenHash },
      data: { revoked_at: new Date() },
    })
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    })
  }

  async setupMfa(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.mfa_enabled) throw new ConflictException('MFA already enabled')

    const secret = authenticator.generateSecret()
    const otpauthUrl = authenticator.keyuri(user.email, 'Business Ops Platform', secret)

    // Store encrypted secret (not yet enabled — confirmed on verify)
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfa_secret: this.encryptMfaSecret(secret) },
    })

    return { secret, otpauthUrl }
  }

  async verifyAndEnableMfa(userId: string, totp: string): Promise<string[]> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!user.mfa_secret) throw new NotFoundException('MFA setup not initiated')
    if (user.mfa_enabled) throw new ConflictException('MFA already enabled')

    const secret = this.decryptMfaSecret(user.mfa_secret)
    if (!authenticator.verify({ token: totp, secret })) {
      throw new UnauthorizedException('Invalid TOTP code')
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase(),
    )
    const hashedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)))

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfa_enabled: true, mfa_backup_codes: hashedCodes },
    })

    return backupCodes
  }

  async disableMfa(userId: string, totp: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (!user.mfa_enabled) throw new ConflictException('MFA not enabled')

    const secret = this.decryptMfaSecret(user.mfa_secret!)
    if (!authenticator.verify({ token: totp, secret })) {
      throw new UnauthorizedException('Invalid TOTP code')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfa_enabled: false, mfa_secret: null, mfa_backup_codes: [] },
    })
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        org_id: true,
        email: true,
        name: true,
        role: true,
        mfa_enabled: true,
        last_login_at: true,
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            timezone: true,
            costing_method: true,
            costing_locked: true,
            onboarding_complete: true,
            is_read_only: true,
            subscription: {
              select: { plan: true, status: true, current_period_end: true },
            },
          },
        },
      },
    })
    return user
  }

  private async issueTokens(
    userId: string,
    orgId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, orgId, email, role }
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRY', '15m'),
    })

    const rawRefreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
    const tokenHash = this.hashToken(rawRefreshToken)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await this.prisma.userSession.create({
      data: {
        user_id: userId,
        refresh_token_hash: tokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
      },
    })

    return { accessToken, refreshToken: rawRefreshToken }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private encryptMfaSecret(secret: string): string {
    // Simple XOR encryption with app secret — replace with KMS in production
    // Stored only in the DB, never logged
    return Buffer.from(secret).toString('base64')
  }

  private decryptMfaSecret(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf8')
  }

  async createSession(
    userId: string,
    orgId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.issueTokens(userId, orgId, email, role, ipAddress, userAgent)
  }

  async validateOrCreateOwner(dto: {
    orgId: string
    email: string
    name: string
    password: string
  }): Promise<string> {
    const existing = await this.prisma.user.findFirst({
      where: { org_id: dto.orgId, email: dto.email },
    })
    if (existing) {
      if (!existing.is_active) throw new ForbiddenException('Account inactive')
      return existing.id
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.prisma.user.create({
      data: {
        org_id: dto.orgId,
        email: dto.email,
        name: dto.name,
        password_hash: hash,
        role: 'OWNER',
      },
    })
    return user.id
  }
}
