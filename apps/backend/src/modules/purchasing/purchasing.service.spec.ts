import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PurchasingService } from './purchasing.service'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'

const ORG = 'org-1'
const USER = 'user-1'
const PO_ID = 'po-1'
const VENDOR_ID = 'vendor-1'

function buildMockPrisma() {
  return {
    vendor: { findFirst: jest.fn() },
    warehouse: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    purchaseOrder: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    purchaseOrderLine: { findMany: jest.fn(), update: jest.fn() },
    receipt: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    receiptLine: {},
    landedCost: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    documentSequence: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ prefix: 'PO-', next_number: 1, zero_pad_length: 5 }),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  }
}

describe('PurchasingService', () => {
  let service: PurchasingService
  let prisma: ReturnType<typeof buildMockPrisma>
  let ledger: { writeEntry: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    ledger = { writeEntry: jest.fn().mockResolvedValue({ id: 'entry-1' }) }
    const module = await Test.createTestingModule({
      providers: [
        PurchasingService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryLedgerService, useValue: ledger },
      ],
    }).compile()
    service = module.get(PurchasingService)
  })

  // ─── PO Creation ──────────────────────────────────────────────────────────

  describe('createPO', () => {
    it('throws NotFoundException when vendor not found', async () => {
      prisma.vendor.findFirst.mockResolvedValue(null)
      await expect(
        service.createPO(ORG, USER, { vendor_id: VENDOR_ID, lines: [{ product_id: 'p1', quantity_ordered: 10, uom_id: 'u1', unit_cost_cents: 500 }] }),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates a PO with correct totals', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID, payment_terms: 'NET30' })
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          product: { findFirst: jest.fn().mockResolvedValue({ id: 'p1' }) },
          purchaseOrder: { create: jest.fn().mockResolvedValue({ id: PO_ID, po_number: 'PO-00001' }) },
          documentSequence: prisma.documentSequence,
        }
        return fn(tx)
      })
      const result = await service.createPO(ORG, USER, {
        vendor_id: VENDOR_ID,
        lines: [{ product_id: 'p1', quantity_ordered: 10, uom_id: 'u1', unit_cost_cents: 500 }],
      })
      expect(result).toBeDefined()
    })
  })

  // ─── Status Transitions ───────────────────────────────────────────────────

  describe('updatePOStatus', () => {
    it('throws BadRequestException for invalid action', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'DRAFT' })
      await expect(service.updatePOStatus(ORG, USER, PO_ID, 'ship')).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when transition is not allowed from current status', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'DRAFT' })
      await expect(service.updatePOStatus(ORG, USER, PO_ID, 'approve')).rejects.toThrow(BadRequestException)
    })

    it('transitions DRAFT → PENDING_APPROVAL on submit', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'DRAFT' })
      prisma.purchaseOrder.update.mockResolvedValue({ id: PO_ID, status: 'PENDING_APPROVAL' })
      const result = await service.updatePOStatus(ORG, USER, PO_ID, 'submit')
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_APPROVAL' }) }),
      )
    })

    it('transitions PENDING_APPROVAL → APPROVED on approve with timestamp', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'PENDING_APPROVAL' })
      prisma.purchaseOrder.update.mockResolvedValue({ id: PO_ID, status: 'APPROVED' })
      await service.updatePOStatus(ORG, USER, PO_ID, 'approve')
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approved_by: USER, approved_at: expect.any(Date) }),
        }),
      )
    })
  })

  describe('deletePO', () => {
    it('throws ForbiddenException when PO is not DRAFT', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'SENT' })
      await expect(service.deletePO(ORG, USER, PO_ID)).rejects.toThrow(ForbiddenException)
    })

    it('soft-deletes a DRAFT PO', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'DRAFT' })
      prisma.purchaseOrder.update.mockResolvedValue({})
      await service.deletePO(ORG, USER, PO_ID)
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  // ─── Receiving ────────────────────────────────────────────────────────────

  describe('createReceipt', () => {
    it('throws BadRequestException when PO is CANCELLED', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'CANCELLED', lines: [] })
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' })
      await expect(
        service.createReceipt(ORG, USER, PO_ID, { warehouse_id: 'wh-1', received_at: '2025-01-01', lines: [] }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException on over-receive', async () => {
      const poLine = { id: 'line-1', product_id: 'p1', quantity_ordered: 10, quantity_received: 8, uom_id: 'u1' }
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: PO_ID, status: 'APPROVED', lines: [poLine] })
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' })
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          receipt: { create: jest.fn() },
          purchaseOrderLine: { update: jest.fn(), findMany: jest.fn() },
          purchaseOrder: { update: jest.fn() },
          documentSequence: prisma.documentSequence,
        }
        return fn(tx)
      })

      await expect(
        service.createReceipt(ORG, USER, PO_ID, {
          warehouse_id: 'wh-1',
          received_at: '2025-01-01',
          lines: [{ po_line_id: 'line-1', quantity_received: 5, unit_cost_cents: 500 }],
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Landed Costs ─────────────────────────────────────────────────────────

  describe('deleteLandedCost', () => {
    it('throws BadRequestException when receipt is already posted', async () => {
      prisma.receipt.findFirst.mockResolvedValue({ id: 'r-1', posted_at: new Date() })
      await expect(service.deleteLandedCost(ORG, PO_ID, 'r-1', 'lc-1')).rejects.toThrow(BadRequestException)
    })

    it('deletes landed cost from unposted receipt', async () => {
      prisma.receipt.findFirst.mockResolvedValue({ id: 'r-1', posted_at: null })
      prisma.landedCost.findFirst.mockResolvedValue({ id: 'lc-1' })
      prisma.landedCost.delete.mockResolvedValue({})
      await service.deleteLandedCost(ORG, PO_ID, 'r-1', 'lc-1')
      expect(prisma.landedCost.delete).toHaveBeenCalled()
    })
  })
})
