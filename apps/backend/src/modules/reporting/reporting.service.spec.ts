import { Test } from '@nestjs/testing'
import { ReportingService } from './reporting.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-uuid'
const FROM = new Date('2025-01-01')
const TO = new Date('2025-12-31')

function buildMockPrisma() {
  return {
    salesOrder: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    invoice: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    weightedAverageCost: { findMany: jest.fn() },
    inventoryLedgerEntry: { findMany: jest.fn(), groupBy: jest.fn() },
    quote: { count: jest.fn() },
    purchaseOrder: { count: jest.fn() },
    workOrder: { count: jest.fn(), findMany: jest.fn() },
    invoiceLine: { groupBy: jest.fn() },
    product: { findUnique: jest.fn() },
    customer: { findUnique: jest.fn() },
    vendor: { findUnique: jest.fn() },
  }
}

describe('ReportingService', () => {
  let service: ReportingService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        ReportingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(ReportingService)
  })

  describe('getInventoryValuationReport', () => {
    it('returns valuation rows with total value = quantity × unit cost', async () => {
      prisma.weightedAverageCost.findMany.mockResolvedValue([
        {
          product_id: 'prod-1',
          warehouse_id: 'wh-1',
          quantity_on_hand: 10,
          average_cost_cents: BigInt(500),
          product: { id: 'prod-1', sku: 'SKU-001', name: 'Widget', type: 'STANDARD' },
          warehouse: { id: 'wh-1', name: 'Main' },
        },
      ])

      const result = await service.getInventoryValuationReport(ORG)
      expect(result).toHaveLength(1)
      expect(Number(result[0].total_value_cents)).toBe(5000) // 10 * 500
      expect(Number(result[0].unit_cost_cents)).toBe(500)
    })
  })

  describe('getExecutiveDashboard', () => {
    it('aggregates dashboard data from multiple sources', async () => {
      prisma.invoice.aggregate.mockResolvedValue({ _sum: { total_cents: BigInt(100000) } })
      prisma.salesOrder.count.mockResolvedValue(5)
      prisma.salesOrder.aggregate.mockResolvedValue({ _avg: { total_cents: BigInt(5000) } })
      prisma.invoice.count.mockResolvedValue(2)
      prisma.invoice.groupBy.mockResolvedValue([])
      prisma.quote.count.mockResolvedValue(3)
      prisma.weightedAverageCost.findMany.mockResolvedValue([])
      prisma.invoiceLine.groupBy.mockResolvedValue([])
      prisma.invoice.findMany.mockResolvedValue([])

      const result = await service.getExecutiveDashboard(ORG, FROM, TO)
      expect(result).toHaveProperty('revenue')
      expect(result).toHaveProperty('open_orders')
      expect(result).toHaveProperty('overdue_invoices')
    })
  })
})
