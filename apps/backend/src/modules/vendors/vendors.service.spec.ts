import { Test } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { VendorsService } from './vendors.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-1'
const USER = 'user-1'
const VENDOR_ID = 'vendor-1'

function buildMockPrisma() {
  return {
    vendor: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    vendorContact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    vendorPriceListEntry: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
    purchaseOrder: { findFirst: jest.fn() },
    product: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  }
}

describe('VendorsService', () => {
  let service: VendorsService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()
    const module = await Test.createTestingModule({
      providers: [VendorsService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = module.get(VendorsService)
  })

  describe('create', () => {
    it('creates a vendor', async () => {
      prisma.vendor.findFirst.mockResolvedValue(null)
      prisma.vendor.create.mockResolvedValue({ id: VENDOR_ID })
      const result = await service.create(ORG, USER, { name: 'Acme Co' })
      expect(result).toEqual({ id: VENDOR_ID })
    })

    it('throws ConflictException on duplicate code', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID })
      await expect(service.create(ORG, USER, { name: 'Acme Co', code: 'ACME' })).rejects.toThrow(ConflictException)
    })
  })

  describe('delete', () => {
    it('throws BadRequestException when vendor has open POs', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID })
      prisma.purchaseOrder.findFirst.mockResolvedValue({ id: 'po-1' })
      await expect(service.delete(ORG, USER, VENDOR_ID)).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes vendor with no open POs', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID })
      prisma.purchaseOrder.findFirst.mockResolvedValue(null)
      prisma.vendor.update.mockResolvedValue({})
      await service.delete(ORG, USER, VENDOR_ID)
      expect(prisma.vendor.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  describe('upsertPriceEntry', () => {
    it('throws NotFoundException when product not found', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID })
      prisma.product.findFirst.mockResolvedValue(null)
      await expect(
        service.upsertPriceEntry(ORG, VENDOR_ID, {
          product_id: 'missing', unit_cost_cents: 1000, uom_id: 'uom-1', effective_from: '2025-01-01',
        }),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates a price list entry', async () => {
      prisma.vendor.findFirst.mockResolvedValue({ id: VENDOR_ID })
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' })
      prisma.vendorPriceListEntry.create.mockResolvedValue({ id: 'entry-1' })
      const result = await service.upsertPriceEntry(ORG, VENDOR_ID, {
        product_id: 'prod-1', unit_cost_cents: 1000, uom_id: 'uom-1', effective_from: '2025-01-01',
      })
      expect(result).toEqual({ id: 'entry-1' })
    })
  })
})
