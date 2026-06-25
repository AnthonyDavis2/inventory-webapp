import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { SalesService } from './sales.service'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

const mockCustomer = { id: 'cust-1', org_id: ORG, name: 'Acme Corp', payment_terms: 'NET30', deleted_at: null }
const mockProduct = { id: 'prod-1', org_id: ORG, sku: 'SKU-001', name: 'Widget', deleted_at: null }

const mockQuote = {
  id: 'quote-1',
  org_id: ORG,
  quote_number: 'QT-00001',
  customer_id: 'cust-1',
  status: 'DRAFT',
  subtotal_cents: BigInt(10000),
  tax_cents: BigInt(0),
  total_cents: BigInt(10000),
  deleted_at: null,
  lines: [],
}

const mockSO = {
  id: 'so-1',
  org_id: ORG,
  order_number: 'SO-00001',
  customer_id: 'cust-1',
  status: 'CONFIRMED',
  fulfillment_status: 'UNFULFILLED',
  deleted_at: null,
  lines: [
    { id: 'line-1', product_id: 'prod-1', quantity: 10, quantity_fulfilled: 0, unit_price_cents: BigInt(1000) },
  ],
}

function buildMockPrisma() {
  return {
    customer: { findFirst: jest.fn() },
    quote: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    salesOrder: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    product: { findFirst: jest.fn() },
    shipment: { create: jest.fn() },
    rma: { create: jest.fn(), findFirst: jest.fn() },
    documentSequence: { findFirst: jest.fn(), update: jest.fn() },
    inventoryLedgerEntry: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  }
}

describe('SalesService', () => {
  let service: SalesService
  let prisma: ReturnType<typeof buildMockPrisma>
  let ledger: { writeEntry: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    ledger = { writeEntry: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryLedgerService, useValue: ledger },
      ],
    }).compile()

    service = module.get(SalesService)
  })

  describe('getQuote', () => {
    it('returns quote when found', async () => {
      prisma.quote.findFirst.mockResolvedValue({ ...mockQuote, customer: mockCustomer })
      const result = await service.getQuote(ORG, 'quote-1')
      expect(result.id).toBe('quote-1')
    })

    it('throws NotFoundException when quote missing', async () => {
      prisma.quote.findFirst.mockResolvedValue(null)
      await expect(service.getQuote(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateQuoteStatus', () => {
    it('transitions DRAFT → SENT on "send" action', async () => {
      prisma.quote.findFirst.mockResolvedValue({ ...mockQuote, status: 'DRAFT' })
      prisma.quote.update.mockResolvedValue({ ...mockQuote, status: 'SENT' })
      const result = await service.updateQuoteStatus(ORG, USER, 'quote-1', 'send')
      expect(prisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }),
      )
      expect(result.status).toBe('SENT')
    })

    it('throws BadRequest when transitioning from invalid status', async () => {
      prisma.quote.findFirst.mockResolvedValue({ ...mockQuote, status: 'REJECTED' })
      await expect(service.updateQuoteStatus(ORG, USER, 'quote-1', 'send')).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequest for unknown action', async () => {
      prisma.quote.findFirst.mockResolvedValue({ ...mockQuote, status: 'DRAFT' })
      await expect(service.updateQuoteStatus(ORG, USER, 'quote-1', 'voidIt')).rejects.toThrow(BadRequestException)
    })

    it('throws NotFoundException when quote does not exist', async () => {
      prisma.quote.findFirst.mockResolvedValue(null)
      await expect(service.updateQuoteStatus(ORG, USER, 'ghost', 'send')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createQuote', () => {
    it('throws NotFoundException when customer not in org', async () => {
      prisma.customer.findFirst.mockResolvedValue(null)
      await expect(
        service.createQuote(ORG, USER, { customer_id: 'bad', lines: [] } as any),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getSO', () => {
    it('throws NotFoundException when SO missing', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(null)
      await expect(service.getSO(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createShipment', () => {
    it('throws NotFoundException when SO not found', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(null)
      await expect(
        service.createShipment(ORG, USER, 'so-ghost', { warehouse_id: 'wh-1', lines: [] } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when SO is not fulfillable', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue({ ...mockSO, status: 'CANCELLED' })
      await expect(
        service.createShipment(ORG, USER, 'so-1', { warehouse_id: 'wh-1', lines: [{ so_line_id: 'line-1', quantity: 5 }] } as any),
      ).rejects.toThrow(BadRequestException)
    })
  })
})
