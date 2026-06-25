import { BadRequestException } from '@nestjs/common'
import { InventoryLedgerService } from './inventory-ledger.service'

describe('InventoryLedgerService', () => {
  let service: InventoryLedgerService

  beforeEach(() => {
    service = new InventoryLedgerService()
  })

  function buildTx(overrides: Record<string, any> = {}) {
    return {
      product: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ stocking_uom_id: 'uom-1' }),
      },
      inventoryLedgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'entry-1', quantity: 10 }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 10 } }),
      },
      fifoCostLayer: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      weightedAverageCost: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      ...overrides,
    }
  }

  const baseInput = {
    orgId: 'org-1',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    movementType: 'INVENTORY_ADJUSTMENT' as any,
    unitCostCents: BigInt(1000),
    referenceType: 'INVENTORY_ADJUSTMENT' as any,
    referenceId: 'ref-1',
    createdBy: 'user-1',
  }

  describe('writeEntry', () => {
    it('creates ledger entry and FIFO layer for receipts', async () => {
      const tx = buildTx()
      await service.writeEntry(tx as any, { ...baseInput, quantity: 10 })
      expect(tx.inventoryLedgerEntry.create).toHaveBeenCalled()
      expect(tx.fifoCostLayer.create).toHaveBeenCalled()
      expect(tx.weightedAverageCost.upsert).toHaveBeenCalled()
    })

    it('consumes FIFO layers for outbound movements', async () => {
      const tx = buildTx({
        fifoCostLayer: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([
            { id: 'layer-1', quantity_remaining: 10, received_at: new Date() },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      })
      await service.writeEntry(tx as any, { ...baseInput, quantity: -5 })
      expect(tx.fifoCostLayer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity_remaining: 5 }) }),
      )
    })

    it('throws BadRequestException when insufficient FIFO stock', async () => {
      const tx = buildTx({
        fifoCostLayer: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([
            { id: 'layer-1', quantity_remaining: 3, received_at: new Date() },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
        inventoryLedgerEntry: {
          create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
        },
      })
      await expect(
        service.writeEntry(tx as any, { ...baseInput, quantity: -10 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('marks FIFO layer fully_consumed_at when quantity_remaining reaches 0', async () => {
      const tx = buildTx({
        fifoCostLayer: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([
            { id: 'layer-1', quantity_remaining: 5, received_at: new Date() },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      })
      await service.writeEntry(tx as any, { ...baseInput, quantity: -5 })
      expect(tx.fifoCostLayer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity_remaining: 0,
            fully_consumed_at: expect.any(Date),
          }),
        }),
      )
    })
  })

  describe('WAC calculation', () => {
    it('computes correct WAC when receiving into an empty location', async () => {
      const tx = buildTx()
      await service.writeEntry(tx as any, { ...baseInput, quantity: 10, unitCostCents: BigInt(500) })
      expect(tx.weightedAverageCost.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ average_cost_cents: BigInt(500), quantity_on_hand: 10 }),
        }),
      )
    })

    it('blends WAC correctly when adding to existing stock', async () => {
      const tx = buildTx({
        weightedAverageCost: {
          findUnique: jest.fn().mockResolvedValue({ quantity_on_hand: 10, average_cost_cents: BigInt(400) }),
          upsert: jest.fn().mockResolvedValue({}),
        },
      })
      // Adding 10 units at $6.00 to 10 units at $4.00 → avg should be $5.00
      await service.writeEntry(tx as any, { ...baseInput, quantity: 10, unitCostCents: BigInt(600) })
      expect(tx.weightedAverageCost.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ average_cost_cents: BigInt(500) }),
        }),
      )
    })
  })

  describe('getStockLevel', () => {
    it('returns aggregated quantity', async () => {
      const tx = buildTx()
      const result = await service.getStockLevel(tx as any, 'org-1', 'prod-1', 'wh-1')
      expect(result).toBe(10)
    })

    it('returns 0 when no entries exist', async () => {
      const tx = buildTx({
        inventoryLedgerEntry: {
          create: jest.fn(),
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: null } }),
        },
      })
      const result = await service.getStockLevel(tx as any, 'org-1', 'prod-1', 'wh-1')
      expect(result).toBe(0)
    })
  })
})
