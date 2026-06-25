import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { CostingService } from './costing.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-uuid'

const mockProduct = { id: 'prod-1', org_id: ORG, sku: 'SKU-001', name: 'Widget', deleted_at: null }
const mockOverheadRule = { org_id: ORG, method: 'PCT_OF_MATERIAL', pct_of_material: 10, per_unit_cents: null, per_hour_cents: null }
const mockWAC = { org_id: ORG, product_id: 'comp-1', average_cost_cents: BigInt(500) }

function buildMockPrisma() {
  return {
    product: { findFirst: jest.fn() },
    overheadAllocationRule: { findUnique: jest.fn(), upsert: jest.fn() },
    productStandardCost: { updateMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    bOMLine: { findMany: jest.fn() },
    weightedAverageCost: { findFirst: jest.fn() },
    workOrderLaborEntry: { aggregate: jest.fn() },
    workOrderMaterialLine: { findMany: jest.fn() },
    workOrderLaborLine: { findMany: jest.fn() },
    workOrder: { findFirst: jest.fn() },
  }
}

describe('CostingService', () => {
  let service: CostingService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        CostingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(CostingService)
  })

  describe('getOverheadRule', () => {
    it('returns overhead rule for org', async () => {
      prisma.overheadAllocationRule.findUnique.mockResolvedValue(mockOverheadRule)
      const result = await service.getOverheadRule(ORG)
      expect(result).toMatchObject({ method: 'PCT_OF_MATERIAL' })
    })

    it('returns null when no rule set', async () => {
      prisma.overheadAllocationRule.findUnique.mockResolvedValue(null)
      const result = await service.getOverheadRule(ORG)
      expect(result).toBeNull()
    })
  })

  describe('upsertOverheadRule', () => {
    it('upserts the overhead rule', async () => {
      prisma.overheadAllocationRule.upsert.mockResolvedValue(mockOverheadRule)
      await service.upsertOverheadRule(ORG, 'PCT_OF_MATERIAL', 10)
      expect(prisma.overheadAllocationRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { org_id: ORG } }),
      )
    })
  })

  describe('calcStandardCost', () => {
    it('throws NotFoundException when product not in org', async () => {
      prisma.product.findFirst.mockResolvedValue(null)
      await expect(service.calcStandardCost(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })

    it('calculates material + overhead cost from BOM lines', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct)
      prisma.bOMLine.findMany.mockResolvedValue([{ component_id: 'comp-1', quantity: 2, scrap_pct: 0 }])
      prisma.weightedAverageCost.findFirst.mockResolvedValue(mockWAC) // 500 cents per unit
      prisma.workOrderLaborEntry.aggregate.mockResolvedValue({ _sum: { total_cents: BigInt(0) }, _count: { _all: 0 } })
      prisma.overheadAllocationRule.findUnique.mockResolvedValue(mockOverheadRule) // 10% of material
      prisma.productStandardCost.updateMany.mockResolvedValue({ count: 0 })
      prisma.productStandardCost.create.mockImplementation(({ data }) => Promise.resolve({ id: 'sc-1', ...data }))

      const result = await service.calcStandardCost(ORG, 'prod-1', 'ver-1')
      // material = 2 * 500 = 1000, overhead = 10% of 1000 = 100, total = 1100
      expect(Number(result.total_cost_cents)).toBe(1100)
    })
  })
})
