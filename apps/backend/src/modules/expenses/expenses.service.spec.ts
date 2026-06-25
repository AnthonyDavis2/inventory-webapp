import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ExpensesService } from './expenses.service'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

const mockCategory = { id: 'cat-1', org_id: ORG, name: 'Office Supplies', is_overhead: false, deleted_at: null }
const mockExpense = {
  id: 'exp-1', org_id: ORG, category_id: 'cat-1', description: 'Pens', amount_cents: BigInt(1500),
  expense_date: new Date(), deleted_at: null,
}

function buildMockPrisma() {
  return {
    expenseCategory: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    expense: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  }
}

describe('ExpensesService', () => {
  let service: ExpensesService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { getPresignedUploadUrl: jest.fn(), getPresignedDownloadUrl: jest.fn() } },
      ],
    }).compile()

    service = module.get(ExpensesService)
  })

  describe('deleteCategory', () => {
    it('throws NotFoundException when category not found', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValueOnce(null)
      await expect(service.deleteCategory(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when category has expenses', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValueOnce(mockCategory)
      prisma.expense.findFirst.mockResolvedValue(mockExpense)
      await expect(service.deleteCategory(ORG, 'cat-1')).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes category when it has no expenses', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValueOnce(mockCategory)
      prisma.expense.findFirst.mockResolvedValue(null)
      prisma.expenseCategory.update.mockResolvedValue({ ...mockCategory, deleted_at: new Date() })
      await service.deleteCategory(ORG, 'cat-1')
      expect(prisma.expenseCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  describe('create', () => {
    it('throws NotFoundException when category not in org', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(null)
      await expect(
        service.create(ORG, USER, { category_id: 'bad', description: 'X', amount_cents: 1000, expense_date: '2025-01-01' } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates expense when valid', async () => {
      prisma.expenseCategory.findFirst.mockResolvedValue(mockCategory)
      prisma.expense.create.mockResolvedValue(mockExpense)
      const result = await service.create(ORG, USER, {
        category_id: 'cat-1', description: 'Pens', amount_cents: 1500, expense_date: '2025-01-01',
      } as any)
      expect(prisma.expense.create).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ id: 'exp-1' })
    })
  })

  describe('getOne', () => {
    it('returns expense when found', async () => {
      prisma.expense.findFirst.mockResolvedValue({ ...mockExpense, category: mockCategory })
      const result = await service.getOne(ORG, 'exp-1')
      expect(result.id).toBe('exp-1')
    })

    it('throws NotFoundException when expense missing', async () => {
      prisma.expense.findFirst.mockResolvedValue(null)
      await expect(service.getOne(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })
})
