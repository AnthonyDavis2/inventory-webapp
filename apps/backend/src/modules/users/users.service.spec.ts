import { Test } from '@nestjs/testing'
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersService } from './users.service'
import { PrismaService } from '../../core/database/prisma.service'
import { MailService } from '../../core/mail/mail.service'

const mockUser = {
  id: 'user-uuid',
  org_id: 'org-uuid',
  email: 'john@acme.com',
  name: 'John Doe',
  role: 'ADMIN',
  is_active: true,
  mfa_enabled: false,
  last_login_at: null,
  created_at: new Date(),
}

const pendingUser = {
  ...mockUser,
  id: 'pending-uuid',
  is_active: false,
  invitation_token: 'valid-token',
  invitation_expires: new Date(Date.now() + 3_600_000),
  password_hash: '',
}

function buildMockPrisma() {
  return {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userSession: {
      updateMany: jest.fn(),
    },
    organization: {
      findUniqueOrThrow: jest.fn(),
    },
  }
}

describe('UsersService', () => {
  let service: UsersService
  let prisma: ReturnType<typeof buildMockPrisma>
  let mail: { sendInvitation: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    mail = { sendInvitation: jest.fn().mockResolvedValue('email-id') }

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') } },
      ],
    }).compile()

    service = module.get(UsersService)
  })

  describe('inviteUser', () => {
    it('creates a pending user and sends invitation email', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ name: 'Acme' })
      prisma.user.create.mockResolvedValue(pendingUser)

      const result = await service.inviteUser('org-uuid', 'inviter-uuid', {
        email: 'john@acme.com',
        name: 'John Doe',
        role: 'ADMIN',
      })

      expect(result.is_active).toBe(false)
      expect(mail.sendInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'john@acme.com', orgName: 'Acme' }),
      )
    })

    it('throws ConflictException when user already exists in the org', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser)

      await expect(
        service.inviteUser('org-uuid', 'inviter-uuid', {
          email: 'john@acme.com',
          name: 'John Doe',
          role: 'ADMIN',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('acceptInvite', () => {
    it('activates the user and clears the invitation token', async () => {
      prisma.user.findFirst.mockResolvedValue(pendingUser)
      prisma.user.update.mockResolvedValue({ ...pendingUser, is_active: true, invitation_token: null })

      const result = await service.acceptInvite({ token: 'valid-token', password: 'newPassword1' })

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            is_active: true,
            invitation_token: null,
            invitation_expires: null,
          }),
        }),
      )
      expect(result.is_active).toBe(true)
    })

    it('throws NotFoundException for an invalid token', async () => {
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(
        service.acceptInvite({ token: 'bad-token', password: 'newPassword1' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when invitation already accepted', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...pendingUser, is_active: true })

      await expect(
        service.acceptInvite({ token: 'valid-token', password: 'newPassword1' }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException when invitation has expired', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...pendingUser,
        invitation_expires: new Date(Date.now() - 1000),
      })

      await expect(
        service.acceptInvite({ token: 'valid-token', password: 'newPassword1' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('deactivateUser', () => {
    it('throws BadRequestException when deactivating own account', async () => {
      await expect(
        service.deactivateUser('org-uuid', 'user-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ForbiddenException when deactivating an owner', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, role: 'OWNER' })

      await expect(
        service.deactivateUser('org-uuid', 'actor-uuid', 'owner-uuid'),
      ).rejects.toThrow(ForbiddenException)
    })

    it('deactivates user and revokes all sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser)
      prisma.user.update.mockResolvedValue({ ...mockUser, is_active: false })
      prisma.userSession.updateMany.mockResolvedValue({ count: 2 })

      await service.deactivateUser('org-uuid', 'actor-uuid', 'user-uuid')

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { is_active: false } }),
      )
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: 'user-uuid', revoked_at: null }),
        }),
      )
    })
  })

  describe('updateUser', () => {
    it('throws ForbiddenException when non-owner tries to change an owner role', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, role: 'OWNER' })

      await expect(
        service.updateUser('org-uuid', 'ADMIN', 'owner-uuid', { role: 'MANAGER' }),
      ).rejects.toThrow(ForbiddenException)
    })
  })
})
