import { Test } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ProductType, BarcodeType } from '@prisma/client'
import { ProductsService } from './products.service'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'

const ORG = 'org-1'
const USER = 'user-1'
const PROD_ID = 'prod-1'

const BASE_UOMS = {
  purchase_uom_id: 'uom-1',
  stocking_uom_id: 'uom-1',
  sales_uom_id: 'uom-1',
}

function buildMockPrisma() {
  return {
    productCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productBarcode: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    productImage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    unitOfMeasure: {
      findMany: jest.fn(),
    },
    inventoryLedgerEntry: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}

describe('ProductsService', () => {
  let service: ProductsService
  let prisma: ReturnType<typeof buildMockPrisma>
  let storage: { getSignedUploadUrl: jest.Mock; getSignedDownloadUrl: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    storage = {
      getSignedUploadUrl: jest.fn().mockResolvedValue('https://upload.example.com'),
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://download.example.com'),
    }
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile()
    service = module.get(ProductsService)
  })

  // ─── Categories ───────────────────────────────────────────────────────────

  describe('createCategory', () => {
    it('creates a root category', async () => {
      prisma.productCategory.create.mockResolvedValue({ id: 'cat-1', name: 'Hardware' })
      const result = await service.createCategory(ORG, { name: 'Hardware' })
      expect(result).toEqual({ id: 'cat-1', name: 'Hardware' })
    })

    it('throws NotFoundException when parent does not exist', async () => {
      prisma.productCategory.findFirst.mockResolvedValue(null)
      await expect(service.createCategory(ORG, { name: 'Sub', parent_id: 'missing' }))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteCategory', () => {
    it('throws BadRequestException when category has subcategories', async () => {
      prisma.productCategory.findFirst.mockResolvedValue({
        id: 'cat-1',
        children: [{ id: 'child-1' }],
      })
      await expect(service.deleteCategory(ORG, 'cat-1')).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when category has products', async () => {
      prisma.productCategory.findFirst.mockResolvedValue({ id: 'cat-1', children: [] })
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      await expect(service.deleteCategory(ORG, 'cat-1')).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Products ─────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      prisma.product.findFirst.mockResolvedValue(null)
      prisma.unitOfMeasure.findMany.mockResolvedValue([{ id: 'uom-1' }])
    })

    it('creates a product', async () => {
      prisma.product.create.mockResolvedValue({ id: PROD_ID })
      const dto = { sku: 'BOLT-1', name: 'Bolt', type: ProductType.COMPONENT, ...BASE_UOMS }
      const result = await service.create(ORG, USER, dto)
      expect(result).toEqual({ id: PROD_ID })
    })

    it('throws ConflictException on duplicate SKU', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      await expect(
        service.create(ORG, USER, { sku: 'BOLT-1', name: 'Bolt', type: ProductType.COMPONENT, ...BASE_UOMS }),
      ).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when UOM IDs are invalid', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([])
      await expect(
        service.create(ORG, USER, { sku: 'BOLT-1', name: 'Bolt', type: ProductType.COMPONENT, ...BASE_UOMS }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('throws BadRequestException when changing stocking UOM after inventory exists', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID, ...BASE_UOMS, stocking_uom_id: 'uom-old' })
      // purchase_uom_id=uom-1, stocking_uom_id=uom-new, sales_uom_id=uom-1 → 2 distinct IDs
      prisma.unitOfMeasure.findMany.mockResolvedValue([{ id: 'uom-1' }, { id: 'uom-new' }])
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue({ id: 'entry-1' })
      await expect(
        service.update(ORG, USER, PROD_ID, { stocking_uom_id: 'uom-new' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('delete', () => {
    it('throws BadRequestException when product has inventory history', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue({ id: 'entry-1' })
      await expect(service.delete(ORG, USER, PROD_ID)).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes product with no inventory history', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue(null)
      prisma.product.update.mockResolvedValue({})
      await service.delete(ORG, USER, PROD_ID)
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  // ─── Variants ─────────────────────────────────────────────────────────────

  describe('createVariant', () => {
    it('throws ConflictException on duplicate variant SKU', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.productVariant.findFirst.mockResolvedValue({ id: 'var-1' })
      await expect(
        service.createVariant(ORG, PROD_ID, { sku: 'V-1', name: 'Variant', attributes: {} }),
      ).rejects.toThrow(ConflictException)
    })

    it('creates a variant', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.productVariant.findFirst.mockResolvedValue(null)
      prisma.productVariant.create.mockResolvedValue({ id: 'var-1' })
      const result = await service.createVariant(ORG, PROD_ID, { sku: 'V-1', name: 'Variant', attributes: { size: 'L' } })
      expect(result).toEqual({ id: 'var-1' })
    })
  })

  // ─── Barcodes ─────────────────────────────────────────────────────────────

  describe('createBarcode', () => {
    it('throws ConflictException when barcode already exists org-wide', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.productBarcode.findFirst.mockResolvedValue({ id: 'bc-1' })
      await expect(
        service.createBarcode(ORG, PROD_ID, { barcode: '123', barcode_type: BarcodeType.CODE_128 }),
      ).rejects.toThrow(ConflictException)
    })

    it('creates barcode and clears previous primary when is_primary=true', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      prisma.productBarcode.findFirst.mockResolvedValue(null)
      const txUpdateMany = jest.fn().mockResolvedValue({})
      const txCreate = jest.fn().mockResolvedValue({ id: 'bc-1' })
      prisma.$transaction.mockImplementation((fn: Function) =>
        fn({ productBarcode: { updateMany: txUpdateMany, create: txCreate } }),
      )
      await service.createBarcode(ORG, PROD_ID, {
        barcode: '123',
        barcode_type: BarcodeType.CODE_128,
        is_primary: true,
      })
      expect(txUpdateMany).toHaveBeenCalled()
      expect(txCreate).toHaveBeenCalled()
    })
  })

  // ─── Images ───────────────────────────────────────────────────────────────

  describe('getUploadUrl', () => {
    it('returns a pre-signed upload URL and storage key', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PROD_ID })
      const result = await service.getUploadUrl(ORG, PROD_ID, 'photo.jpg', 'image/jpeg')
      expect(result.upload_url).toBe('https://upload.example.com')
      expect(result.key).toContain(PROD_ID)
    })
  })

  // ─── Barcode lookup ───────────────────────────────────────────────────────

  describe('findByBarcode', () => {
    it('throws NotFoundException when barcode not found', async () => {
      prisma.productBarcode.findFirst.mockResolvedValue(null)
      await expect(service.findByBarcode(ORG, 'notfound')).rejects.toThrow(NotFoundException)
    })

    it('returns product + variant for a barcode', async () => {
      const record = { id: 'bc-1', product: { id: PROD_ID }, variant: null }
      prisma.productBarcode.findFirst.mockResolvedValue(record)
      const result = await service.findByBarcode(ORG, '123456')
      expect(result).toEqual(record)
    })
  })
})
