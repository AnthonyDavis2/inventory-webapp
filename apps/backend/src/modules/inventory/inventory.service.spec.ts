import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { InventoryLedgerService } from './inventory-ledger.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-1'
const USER = 'user-1'
const PROD_ID = 'prod-1'
const WH_ID = 'wh-1'

function buildMockPrisma() {
  return {
    product: { findFirst: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    inventoryLedgerEntry: { findFirst: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    fifoCostLayer: { findMany: jest.fn() },
    weightedAverageCost: { findMany: jest.fn(), findUnique: jest.fn() },
    reorderRule: { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    lot: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    serialNumber: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  }
}

function buildMockLedger() {
  return {
    writeEntry: jest.fn().mockResolvedValue({ id: 'entry-1' }),
    getStockLevel: jest.fn().mockResolvedValue(100),
  }
}

describe('InventoryService', () => {
  let service: InventoryService
  let prisma: ReturnType<typeof buildMockPrisma>
  let ledger: ReturnType<typeof buildMockLedger>

  beforeEach(async () => {
    prisma = buildMockPrisma()
    ledger = buildMockLedger()
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryLedgerService, useValue: ledger },
      ],
    }).compile()
    service = module.get(InventoryService)
  })

  // ─── Adjustments ──────────────────────────────────────────────────────────

  describe('createAdjustment', () => {
    it('rejects negative adjustment when it would go below zero', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: WH_ID })
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      ledger.getStockLevel.mockResolvedValue(5)
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        await fn({
          inventoryLedgerEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 5 } }) },
        })
      })

      await expect(
        service.createAdjustment(ORG, USER, {
          movement_type: 'INVENTORY_ADJUSTMENT',
          lines: [{ product_id: PROD_ID, warehouse_id: WH_ID, quantity: -10, unit_cost_cents: 500 }],
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('posts adjustment and returns reference_id', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: WH_ID })
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        return fn({
          inventoryLedgerEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 50 } }) },
        })
      })

      const result = await service.createAdjustment(ORG, USER, {
        movement_type: 'INVENTORY_ADJUSTMENT',
        lines: [{ product_id: PROD_ID, warehouse_id: WH_ID, quantity: 10, unit_cost_cents: 500 }],
      })
      expect(result.reference_id).toBeDefined()
    })
  })

  describe('reverseAdjustment', () => {
    it('throws NotFoundException when entry does not exist', async () => {
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValueOnce(null)
      await expect(service.reverseAdjustment(ORG, USER, 'missing')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when entry already reversed', async () => {
      prisma.inventoryLedgerEntry.findFirst
        .mockResolvedValueOnce({ id: 'entry-1', org_id: ORG, movement_type: 'INVENTORY_ADJUSTMENT', quantity: 10 })
        .mockResolvedValueOnce({ id: 'reversal-1' }) // already reversed
      await expect(service.reverseAdjustment(ORG, USER, 'entry-1')).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Transfers ────────────────────────────────────────────────────────────

  describe('createTransfer', () => {
    it('throws BadRequestException when from and to warehouse are the same', async () => {
      await expect(
        service.createTransfer(ORG, USER, {
          from_warehouse_id: WH_ID,
          to_warehouse_id: WH_ID,
          lines: [{ product_id: PROD_ID, quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when insufficient stock in source', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: WH_ID })
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      ledger.getStockLevel.mockResolvedValue(3)
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          weightedAverageCost: { findUnique: jest.fn().mockResolvedValue(null) },
          inventoryLedgerEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 3 } }) },
        }
        return fn(tx)
      })

      await expect(
        service.createTransfer(ORG, USER, {
          from_warehouse_id: WH_ID,
          to_warehouse_id: 'wh-2',
          lines: [{ product_id: PROD_ID, quantity: 10 }],
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Lots ─────────────────────────────────────────────────────────────────

  describe('createLot', () => {
    it('throws BadRequestException when product is not lot-tracked', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_lot_tracked: false })
      await expect(
        service.createLot(ORG, { product_id: PROD_ID, lot_number: 'LOT-001' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException on duplicate lot number', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_lot_tracked: true })
      prisma.lot.findFirst.mockResolvedValue({ id: 'lot-1' })
      await expect(
        service.createLot(ORG, { product_id: PROD_ID, lot_number: 'LOT-001' }),
      ).rejects.toThrow(ConflictException)
    })

    it('creates lot for a lot-tracked product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_lot_tracked: true })
      prisma.lot.findFirst.mockResolvedValue(null)
      prisma.lot.create.mockResolvedValue({ id: 'lot-1', lot_number: 'LOT-001' })
      const result = await service.createLot(ORG, { product_id: PROD_ID, lot_number: 'LOT-001' })
      expect(result).toEqual({ id: 'lot-1', lot_number: 'LOT-001' })
    })
  })

  // ─── Serial Numbers ───────────────────────────────────────────────────────

  describe('createSerial', () => {
    it('throws BadRequestException when product is not serial-tracked', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_serial_tracked: false })
      await expect(service.createSerial(ORG, PROD_ID, 'SN-001')).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException on duplicate serial number', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_serial_tracked: true })
      prisma.serialNumber.findFirst.mockResolvedValue({ id: 'sn-1' })
      await expect(service.createSerial(ORG, PROD_ID, 'SN-001')).rejects.toThrow(ConflictException)
    })

    it('creates serial number for a serial-tracked product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, is_serial_tracked: true })
      prisma.serialNumber.findFirst.mockResolvedValue(null)
      prisma.serialNumber.create.mockResolvedValue({ id: 'sn-1', serial_number: 'SN-001' })
      const result = await service.createSerial(ORG, PROD_ID, 'SN-001')
      expect(result).toEqual({ id: 'sn-1', serial_number: 'SN-001' })
    })
  })

  // ─── Reorder Rules ────────────────────────────────────────────────────────

  describe('getBelowReorderPoint', () => {
    it('returns only products below their reorder point', async () => {
      prisma.reorderRule.findMany.mockResolvedValue([
        { product_id: 'p1', warehouse_id: 'w1', reorder_point: '50', product: {}, warehouse: {} },
        { product_id: 'p2', warehouse_id: 'w1', reorder_point: '20', product: {}, warehouse: {} },
      ])
      prisma.inventoryLedgerEntry.groupBy.mockResolvedValue([
        { product_id: 'p1', warehouse_id: 'w1', _sum: { quantity: 30 } }, // below 50 → alert
        { product_id: 'p2', warehouse_id: 'w1', _sum: { quantity: 25 } }, // above 20 → ok
      ])

      const result = await service.getBelowReorderPoint(ORG)
      expect(result).toHaveLength(1)
      expect(result[0].rule.product_id).toBe('p1')
    })
  })

  describe('upsertReorderRule', () => {
    it('upserts a reorder rule', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.warehouse.findFirst.mockResolvedValue({ id: WH_ID })
      prisma.reorderRule.upsert.mockResolvedValue({ id: 'rule-1' })
      const result = await service.upsertReorderRule(ORG, {
        product_id: PROD_ID,
        warehouse_id: WH_ID,
        reorder_point: 10,
        reorder_quantity: 50,
        safety_stock: 5,
        lead_time_days: 7,
      })
      expect(result).toEqual({ id: 'rule-1' })
    })
  })
})
