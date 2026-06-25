import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { InvoicingService } from './invoicing.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

const mockCustomer = { id: 'cust-1', org_id: ORG, name: 'Buyer Co', payment_terms: 'NET30', deleted_at: null }

const mockInvoice = {
  id: 'inv-1',
  org_id: ORG,
  invoice_number: 'INV-00001',
  customer_id: 'cust-1',
  status: 'SENT',
  total_cents: BigInt(10000),
  amount_due_cents: BigInt(10000),
  deleted_at: null,
  lines: [],
  payments: [],
}

function buildMockPrisma() {
  return {
    customer: { findFirst: jest.fn() },
    invoice: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    invoicePayment: { create: jest.fn() },
    creditMemo: { findFirst: jest.fn(), create: jest.fn() },
    documentSequence: { findFirst: jest.fn(), update: jest.fn() },
    salesOrder: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  }
}

describe('InvoicingService', () => {
  let service: InvoicingService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        InvoicingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(InvoicingService)
  })

  describe('getInvoice', () => {
    it('returns invoice when found', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, customer: mockCustomer })
      const result = await service.getInvoice(ORG, 'inv-1')
      expect(result.invoice_number).toBe('INV-00001')
    })

    it('throws NotFoundException when missing', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null)
      await expect(service.getInvoice(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createInvoice', () => {
    it('throws NotFoundException when customer not in org', async () => {
      prisma.customer.findFirst.mockResolvedValue(null)
      await expect(
        service.createInvoice(ORG, USER, { customer_id: 'bad', lines: [] } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('calculates totals correctly from line items', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer)
      prisma.documentSequence.findFirst.mockResolvedValue({ next_number: 1, prefix: 'INV-', zero_pad_length: 5 })
      prisma.documentSequence.update.mockResolvedValue({})
      prisma.invoice.create.mockImplementation(({ data }) => Promise.resolve({ id: 'inv-new', ...data }))

      await service.createInvoice(ORG, USER, {
        customer_id: 'cust-1',
        lines: [{ product_id: 'p1', quantity: 2, unit_price_cents: 5000, discount_pct: 0, tax_pct: 0, sort_order: 0 }],
      } as any)

      const createCall = prisma.invoice.create.mock.calls[0][0]
      expect(Number(createCall.data.subtotal_cents)).toBe(10000)
      expect(Number(createCall.data.total_cents)).toBe(10000)
    })
  })

  describe('recordPayment', () => {
    it('throws NotFoundException when invoice missing', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null)
      await expect(
        service.recordPayment(ORG, USER, 'ghost', { amount_cents: 5000, method: 'CHECK', paid_at: new Date().toISOString() } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when invoice is VOID with no balance due', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'VOID', amount_due_cents: BigInt(0) })
      await expect(
        service.recordPayment(ORG, USER, 'inv-1', { amount_cents: 5000, method: 'CHECK', paid_at: new Date().toISOString() } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when invoice is PAID with no balance due', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'PAID', amount_due_cents: BigInt(0) })
      await expect(
        service.recordPayment(ORG, USER, 'inv-1', { amount_cents: 5000, method: 'CHECK', paid_at: new Date().toISOString() } as any),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('voidInvoice', () => {
    it('throws ForbiddenException when invoice is fully paid', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ ...mockInvoice, status: 'PAID' })
      await expect(service.voidInvoice(ORG, USER, 'inv-1')).rejects.toThrow()
    })

    it('throws NotFoundException when invoice missing', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null)
      await expect(service.voidInvoice(ORG, USER, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })
})
