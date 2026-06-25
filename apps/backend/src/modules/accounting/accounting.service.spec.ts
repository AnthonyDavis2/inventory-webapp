import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { AccountingService } from './accounting.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-uuid'

const mockAccount = { id: 'acct-1', org_id: ORG, code: '1000', name: 'Cash', type: 'ASSET', is_system: false, deleted_at: null }
const mockJournalEntry = {
  id: 'je-1', org_id: ORG, date: new Date(), description: 'Test entry', lines: [],
}

function buildMockPrisma() {
  return {
    chartOfAccount: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journalEntryLine: {
      findFirst: jest.fn(),
    },
    journalEntry: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  }
}

describe('AccountingService', () => {
  let service: AccountingService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(AccountingService)
  })

  describe('listAccounts', () => {
    it('returns accounts ordered by code', async () => {
      prisma.chartOfAccount.findMany.mockResolvedValue([mockAccount])
      const result = await service.listAccounts(ORG)
      expect(result).toHaveLength(1)
      expect(prisma.chartOfAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { code: 'asc' } }),
      )
    })
  })

  describe('createAccount', () => {
    it('throws BadRequestException when code already exists', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(mockAccount)
      await expect(service.createAccount(ORG, { code: '1000', name: 'Duplicate', type: 'ASSET' })).rejects.toThrow(BadRequestException)
    })

    it('creates account when code is unique', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(null)
      prisma.chartOfAccount.create.mockResolvedValue(mockAccount)
      const result = await service.createAccount(ORG, { code: '1000', name: 'Cash', type: 'ASSET' })
      expect(prisma.chartOfAccount.create).toHaveBeenCalledTimes(1)
      expect(result.code).toBe('1000')
    })
  })

  describe('deleteAccount', () => {
    it('throws NotFoundException when account missing', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(null)
      await expect(service.deleteAccount(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when account is a system account', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue({ ...mockAccount, is_system: true })
      await expect(service.deleteAccount(ORG, 'acct-1')).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes a non-system account with no journal entries', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(mockAccount)
      prisma.journalEntryLine.findFirst.mockResolvedValue(null)
      prisma.chartOfAccount.update.mockResolvedValue({ ...mockAccount, deleted_at: new Date() })
      await service.deleteAccount(ORG, 'acct-1')
      expect(prisma.chartOfAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })

    it('throws BadRequestException when account has journal entries', async () => {
      prisma.chartOfAccount.findFirst.mockResolvedValue(mockAccount)
      prisma.journalEntryLine.findFirst.mockResolvedValue({ id: 'line-1' })
      await expect(service.deleteAccount(ORG, 'acct-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('createJournalEntry', () => {
    it('throws BadRequestException when debits and credits do not balance', async () => {
      await expect(
        service.createJournalEntry(ORG, 'user-1', {
          date: '2025-01-01',
          description: 'Unbalanced',
          lines: [
            { account_id: 'acct-1', debit_cents: 1000, credit_cents: 0 },
            { account_id: 'acct-2', debit_cents: 0, credit_cents: 500 },
          ],
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })
})
