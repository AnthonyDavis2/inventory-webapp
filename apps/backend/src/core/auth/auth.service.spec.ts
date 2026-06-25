import { Test } from '@nestjs/testing'
import { UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { PrismaService } from '../database/prisma.service'

const mockUser = {
  id: 'user-uuid',
  org_id: 'org-uuid',
  email: 'jane@acme.com',
  name: 'Jane Smith',
  role: 'OWNER',
  is_active: true,
  mfa_enabled: false,
  mfa_secret: null,
  mfa_backup_codes: [],
  password_hash: '',
  last_login_at: null,
  org: { id: 'org-uuid', is_read_only: false },
}

const mockSession = {
  id: 'session-uuid',
  user_id: 'user-uuid',
  refresh_token_hash: 'hashed-token',
  revoked_at: null,
  expires_at: new Date(Date.now() + 86400_000),
  user: mockUser,
}

function buildMockPrisma() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  }
}

describe('AuthService', () => {
  let service: AuthService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret-min-32-chars-xxxxxxxxxx'),
            get: jest.fn().mockReturnValue('15m'),
          },
        },
      ],
    }).compile()

    service = module.get(AuthService)
  })

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10)
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, password_hash: hash })
      prisma.user.update.mockResolvedValue(mockUser)
      prisma.userSession.create.mockResolvedValue(mockSession)

      const result = await service.login({ email: 'jane@acme.com', password: 'password123' })

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBeTruthy()
      expect(typeof result.refreshToken).toBe('string')
    })

    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(
        service.login({ email: 'nobody@acme.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, password_hash: hash })

      await expect(
        service.login({ email: 'jane@acme.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when user is inactive', async () => {
      const hash = await bcrypt.hash('password123', 10)
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        password_hash: hash,
        is_active: false,
      })

      await expect(
        service.login({ email: 'jane@acme.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when MFA enabled but no TOTP provided', async () => {
      const hash = await bcrypt.hash('password123', 10)
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        password_hash: hash,
        mfa_enabled: true,
        mfa_secret: Buffer.from('JBSWY3DPEHPK3PXP').toString('base64'),
      })

      await expect(
        service.login({ email: 'jane@acme.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException)
    })

    it('does not leak whether the email exists via error message', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      const hash = await bcrypt.hash('password123', 10)
      prisma.user.findFirst.mockResolvedValueOnce(null)

      let errorForMissingUser: UnauthorizedException | null = null
      try {
        await service.login({ email: 'nobody@acme.com', password: 'password123' })
      } catch (e) {
        errorForMissingUser = e as UnauthorizedException
      }

      prisma.user.findFirst.mockResolvedValueOnce({ ...mockUser, password_hash: hash })
      let errorForWrongPassword: UnauthorizedException | null = null
      try {
        await service.login({ email: 'jane@acme.com', password: 'wrong' })
      } catch (e) {
        errorForWrongPassword = e as UnauthorizedException
      }

      expect(errorForMissingUser?.message).toBe(errorForWrongPassword?.message)
    })
  })

  describe('refresh', () => {
    it('revokes old session and issues new tokens', async () => {
      prisma.userSession.findUnique.mockResolvedValue(mockSession)
      prisma.userSession.update.mockResolvedValue({ ...mockSession, revoked_at: new Date() })
      prisma.userSession.create.mockResolvedValue(mockSession)
      prisma.user.update.mockResolvedValue(mockUser)

      const result = await service.refresh('raw-token')

      expect(prisma.userSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked_at: expect.any(Date) } }),
      )
      expect(result.accessToken).toBe('mock-access-token')
    })

    it('throws UnauthorizedException for revoked session', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        ...mockSession,
        revoked_at: new Date(Date.now() - 1000),
      })

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException for expired session', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        ...mockSession,
        expires_at: new Date(Date.now() - 1000),
      })

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when session not found', async () => {
      prisma.userSession.findUnique.mockResolvedValue(null)

      await expect(service.refresh('raw-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('logout', () => {
    it('revokes the matching session', async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 })

      await service.logout('raw-token')

      expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked_at: expect.any(Date) } }),
      )
    })
  })

  describe('setupMfa', () => {
    it('throws ConflictException if MFA already enabled', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...mockUser, mfa_enabled: true })

      await expect(service.setupMfa('user-uuid')).rejects.toThrow(ConflictException)
    })

    it('returns a secret and otpauthUrl', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser)
      prisma.user.update.mockResolvedValue(mockUser)

      const result = await service.setupMfa('user-uuid')

      expect(result.secret).toBeTruthy()
      expect(result.otpauthUrl).toContain('otpauth://totp/')
    })
  })

  describe('verifyAndEnableMfa', () => {
    it('throws NotFoundException if MFA setup not initiated', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...mockUser, mfa_secret: null })

      await expect(service.verifyAndEnableMfa('user-uuid', '123456')).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
