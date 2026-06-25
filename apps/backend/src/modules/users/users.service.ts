import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import type { UserRole } from '@prisma/client'
import { PrismaService } from '../../core/database/prisma.service'
import { MailService } from '../../core/mail/mail.service'
import { ConfigService } from '@nestjs/config'
import type { InviteUserDto } from './dto/invite-user.dto'
import type { AcceptInviteDto } from './dto/accept-invite.dto'
import type { UpdateUserDto } from './dto/update-user.dto'

const BCRYPT_ROUNDS = 12
const INVITE_EXPIRY_HOURS = 48

const USER_SELECT = {
  id: true,
  org_id: true,
  email: true,
  name: true,
  role: true,
  is_active: true,
  mfa_enabled: true,
  last_login_at: true,
  created_at: true,
} as const

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async listUsers(orgId: string) {
    return this.prisma.user.findMany({
      where: { org_id: orgId, deleted_at: null },
      select: USER_SELECT,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })
  }

  async getUser(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, org_id: orgId, deleted_at: null },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async inviteUser(orgId: string, invitedById: string, dto: InviteUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { org_id: orgId, email: dto.email, deleted_at: null },
    })
    if (existing) throw new ConflictException('User with this email already exists in your organization')

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000)

    const user = await this.prisma.user.create({
      data: {
        org_id: orgId,
        email: dto.email,
        name: dto.name,
        password_hash: '',
        role: dto.role as UserRole,
        is_active: false,
        invited_by: invitedById,
        invitation_token: token,
        invitation_expires: expires,
      },
      select: USER_SELECT,
    })

    const appUrl = this.config.get('APP_URL', 'http://localhost:3000')
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { name: true },
    })

    await this.mail.sendInvitation({
      to: dto.email,
      name: dto.name,
      orgName: org.name,
      inviteUrl: `${appUrl}/accept-invite?token=${token}`,
    })

    return user
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const user = await this.prisma.user.findFirst({
      where: { invitation_token: dto.token, deleted_at: null },
    })

    if (!user) throw new NotFoundException('Invalid invitation token')
    if (user.is_active) throw new ConflictException('Invitation already accepted')
    if (user.invitation_expires && user.invitation_expires < new Date()) {
      throw new BadRequestException('Invitation has expired')
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hash,
        is_active: true,
        invitation_token: null,
        invitation_expires: null,
      },
      select: USER_SELECT,
    })
  }

  async updateUser(orgId: string, actorRole: string, targetUserId: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, org_id: orgId, deleted_at: null },
    })
    if (!target) throw new NotFoundException('User not found')

    // Only OWNER can change another OWNER's role; ADMIN can change anyone below them
    if (dto.role && target.role === 'OWNER' && actorRole !== 'OWNER') {
      throw new ForbiddenException('Cannot change an owner\'s role')
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: dto.name,
        role: dto.role as UserRole | undefined,
      },
      select: USER_SELECT,
    })
  }

  async deactivateUser(orgId: string, actorId: string, targetUserId: string) {
    if (actorId === targetUserId) {
      throw new BadRequestException('Cannot deactivate your own account')
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, org_id: orgId, deleted_at: null },
    })
    if (!target) throw new NotFoundException('User not found')
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot deactivate an owner')

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { is_active: false },
    })

    // Revoke all active sessions
    await this.prisma.userSession.updateMany({
      where: { user_id: targetUserId, revoked_at: null },
      data: { revoked_at: new Date() },
    })
  }

  async reactivateUser(orgId: string, targetUserId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, org_id: orgId, deleted_at: null },
    })
    if (!target) throw new NotFoundException('User not found')

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { is_active: true },
      select: USER_SELECT,
    })
  }
}
