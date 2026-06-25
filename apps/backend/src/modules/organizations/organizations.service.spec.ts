import { Test } from '@nestjs/testing'
import { ConflictException, BadRequestException } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { PrismaService } from '../../core/database/prisma.service'
import { AuthService } from '../../core/auth/auth.service'
import { BillingService } from '../billing/billing.service'

const mockOrg = {
  id: 'org-uuid',
  name: 'Acme Manufacturing',
  slug: 'acme-mfg-ab12',
  email: 'jane@acme.com',
  onboarding_step: 0,
  onboarding_complete: false,
  costing_method: null,
  costing_locked: false,
  timezone: 'America/New_York',
  fiscal_year_start: 1,
  is_read_only: false,
  deleted_at: null,
}

const mockUser = {
  id: 'user-uuid',
  org_id: 'org-uuid',
  email: 'jane@acme.com',
  name: 'Jane Smith',
  role: 'OWNER',
}

function buildMockPrisma() {
  return {
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}

describe('OrganizationsService', () => {
  let service: OrganizationsService
  let prisma: ReturnType<typeof buildMockPrisma>
  let auth: { createSession: jest.Mock }
  let billing: { onRegister: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    auth = { createSession: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'rtok' }) }
    billing = { onRegister: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: auth },
        { provide: BillingService, useValue: billing },
      ],
    }).compile()

    service = module.get(OrganizationsService)
  })

  describe('register', () => {
    it('creates an org and owner, then issues tokens', async () => {
      prisma.organization.findUnique.mockResolvedValue(null)
      prisma.user.findFirst.mockResolvedValue(null)
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          documentSequence: { createMany: jest.fn().mockResolvedValue({ count: 8 }) },
          taxSettings: { create: jest.fn().mockResolvedValue({}) },
          chartOfAccount: { createMany: jest.fn().mockResolvedValue({ count: 17 }) },
        }
        return fn(tx)
      })

      const result = await service.register({
        orgName: 'Acme Manufacturing',
        ownerName: 'Jane Smith',
        email: 'jane@acme.com',
        password: 'password123',
      })

      expect(result.accessToken).toBe('tok')
      expect(result.refreshToken).toBe('rtok')
      expect(result.orgId).toBe('org-uuid')
      expect(auth.createSession).toHaveBeenCalledWith(
        mockUser.id,
        mockOrg.id,
        mockUser.email,
        mockUser.role,
        undefined,
        undefined,
      )
    })

    it('throws ConflictException when slug is already taken', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg)
      prisma.user.findFirst.mockResolvedValue(null)

      await expect(
        service.register({
          orgName: 'Acme Manufacturing',
          ownerName: 'Jane Smith',
          email: 'jane@acme.com',
          password: 'password123',
          slug: 'acme-mfg-ab12',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when email is already registered', async () => {
      prisma.organization.findUnique.mockResolvedValue(null)
      prisma.user.findFirst.mockResolvedValue(mockUser)

      await expect(
        service.register({
          orgName: 'Acme Manufacturing',
          ownerName: 'Jane Smith',
          email: 'jane@acme.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('advanceOnboarding', () => {
    it('throws BadRequestException when step is out of order', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({ ...mockOrg, onboarding_step: 2 })

      await expect(
        service.advanceOnboarding('org-uuid', { step: 1 } as never),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when setting costing method on locked org', async () => {
      prisma.organization.findUniqueOrThrow.mockResolvedValue({
        ...mockOrg,
        onboarding_step: 1,
        costing_locked: true,
      })
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          organization: { update: jest.fn() },
          taxSettings: { upsert: jest.fn() },
        }
        return fn(tx)
      })

      await expect(
        service.advanceOnboarding('org-uuid', { step: 2, costing_method: 'FIFO' }),
      ).rejects.toThrow(BadRequestException)
    })
  })
})
