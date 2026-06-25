import { Test } from '@nestjs/testing'
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { UomService } from './uom.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-1'

function buildMockPrisma() {
  return {
    unitOfMeasure: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    uOMConversion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}

describe('UomService', () => {
  let service: UomService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()
    const module = await Test.createTestingModule({
      providers: [
        UomService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(UomService)
  })

  describe('listAll', () => {
    it('returns global and custom UOMs', async () => {
      const global = [{ id: '1', org_id: null }]
      const custom = [{ id: '2', org_id: ORG }]
      prisma.unitOfMeasure.findMany
        .mockResolvedValueOnce(global)
        .mockResolvedValueOnce(custom)
      const result = await service.listAll(ORG)
      expect(result).toEqual({ global, custom })
    })
  })

  describe('create', () => {
    it('creates a custom UOM', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null)
      prisma.unitOfMeasure.create.mockResolvedValue({ id: 'uom-1' })
      const dto = { name: 'Box', abbreviation: 'BOX', type: 'EACH' }
      const result = await service.create(ORG, dto)
      expect(result).toEqual({ id: 'uom-1' })
      expect(prisma.unitOfMeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ abbreviation: 'BOX' }) }),
      )
    })

    it('throws ConflictException on duplicate abbreviation', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue({ id: 'existing' })
      await expect(service.create(ORG, { name: 'Box', abbreviation: 'BOX', type: 'EACH' }))
        .rejects.toThrow(ConflictException)
    })
  })

  describe('delete', () => {
    it('throws NotFoundException when UOM does not exist', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null)
      await expect(service.delete(ORG, 'missing-id')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when UOM is in use', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue({ id: 'uom-1', org_id: ORG })
      prisma.product.findFirst.mockResolvedValue({ id: 'prod-1' })
      await expect(service.delete(ORG, 'uom-1')).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes UOM when not in use', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue({ id: 'uom-1', org_id: ORG })
      prisma.product.findFirst.mockResolvedValue(null)
      prisma.unitOfMeasure.update.mockResolvedValue({})
      await service.delete(ORG, 'uom-1')
      expect(prisma.unitOfMeasure.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  describe('createConversion', () => {
    it('throws BadRequestException when from and to are the same', async () => {
      await expect(
        service.createConversion(ORG, { from_uom_id: 'a', to_uom_id: 'a', conversion_factor: 1 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws NotFoundException when source UOM not found', async () => {
      prisma.unitOfMeasure.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'to' })
      await expect(
        service.createConversion(ORG, { from_uom_id: 'missing', to_uom_id: 'to', conversion_factor: 16 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates forward and inverse conversions in a transaction', async () => {
      prisma.unitOfMeasure.findFirst
        .mockResolvedValueOnce({ id: 'from' })
        .mockResolvedValueOnce({ id: 'to' })
      prisma.uOMConversion.findFirst.mockResolvedValue(null)
      const txCreate = jest.fn().mockResolvedValue({ id: 'conv-1' })
      const txUpsert = jest.fn().mockResolvedValue({})
      prisma.$transaction.mockImplementation((fn: Function) =>
        fn({ uOMConversion: { create: txCreate, upsert: txUpsert } }),
      )
      const result = await service.createConversion(ORG, { from_uom_id: 'from', to_uom_id: 'to', conversion_factor: 16 })
      expect(result).toEqual({ id: 'conv-1' })
      expect(txCreate).toHaveBeenCalled()
      expect(txUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ conversion_factor: 1 / 16 }),
        }),
      )
    })
  })

  describe('convert', () => {
    it('returns same quantity when from and to are identical', async () => {
      expect(await service.convert(ORG, 'ea', 'ea', 5)).toBe(5)
    })

    it('applies conversion factor', async () => {
      prisma.uOMConversion.findFirst.mockResolvedValue({ conversion_factor: '16' })
      expect(await service.convert(ORG, 'lb', 'oz', 2)).toBe(32)
    })

    it('throws BadRequestException when no conversion defined', async () => {
      prisma.uOMConversion.findFirst.mockResolvedValue(null)
      await expect(service.convert(ORG, 'a', 'b', 1)).rejects.toThrow(BadRequestException)
    })
  })
})
