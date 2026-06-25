import { Test } from '@nestjs/testing'
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { WarehousesService } from './warehouses.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-1'
const USER = 'user-1'

function buildMockPrisma() {
  return {
    warehouse: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    binLocation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryLedgerEntry: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}

describe('WarehousesService', () => {
  let service: WarehousesService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()
    const module = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get(WarehousesService)
  })

  describe('create', () => {
    it('creates a warehouse and sets it as default if first', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null) // no code conflict, no existing warehouses
      const created = { id: 'wh-1', is_default: true }
      prisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          warehouse: {
            create: jest.fn().mockResolvedValue(created),
            updateMany: jest.fn(),
            findFirst: jest.fn().mockResolvedValue(null),
          },
        }
        return fn(tx)
      })
      const result = await service.create(ORG, USER, { name: 'Main', code: 'WH-001' })
      expect(result).toEqual(created)
    })

    it('throws ConflictException on duplicate code', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'existing' })
      await expect(service.create(ORG, USER, { name: 'X', code: 'WH-001' })).rejects.toThrow(ConflictException)
    })
  })

  describe('delete', () => {
    it('throws NotFoundException when warehouse does not exist', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null)
      await expect(service.delete(ORG, USER, 'missing')).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when deleting the default warehouse', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', is_default: true })
      await expect(service.delete(ORG, USER, 'wh-1')).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when warehouse has inventory history', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', is_default: false })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue({ id: 'entry-1' })
      await expect(service.delete(ORG, USER, 'wh-1')).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes warehouse with no history and not default', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', is_default: false })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue(null)
      prisma.warehouse.update.mockResolvedValue({})
      await service.delete(ORG, USER, 'wh-1')
      expect(prisma.warehouse.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })

  describe('createBin', () => {
    it('throws BadRequestException when bins not enabled', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', bins_enabled: false })
      await expect(service.createBin(ORG, 'wh-1', { code: 'A1' })).rejects.toThrow(BadRequestException)
    })

    it('throws ConflictException on duplicate bin code', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', bins_enabled: true })
      prisma.binLocation.findFirst.mockResolvedValue({ id: 'bin-1' })
      await expect(service.createBin(ORG, 'wh-1', { code: 'A1' })).rejects.toThrow(ConflictException)
    })

    it('creates a bin when warehouse has bins enabled', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1', bins_enabled: true })
      prisma.binLocation.findFirst.mockResolvedValue(null)
      prisma.binLocation.create.mockResolvedValue({ id: 'bin-1', code: 'A1-01' })
      const result = await service.createBin(ORG, 'wh-1', { code: 'A1-01' })
      expect(result).toEqual({ id: 'bin-1', code: 'A1-01' })
    })
  })

  describe('deleteBin', () => {
    it('throws BadRequestException when bin has inventory history', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' })
      prisma.binLocation.findFirst.mockResolvedValue({ id: 'bin-1' })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue({ id: 'entry-1' })
      await expect(service.deleteBin(ORG, 'wh-1', 'bin-1')).rejects.toThrow(BadRequestException)
    })

    it('soft-deletes bin with no history', async () => {
      prisma.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' })
      prisma.binLocation.findFirst.mockResolvedValue({ id: 'bin-1' })
      prisma.inventoryLedgerEntry.findFirst.mockResolvedValue(null)
      prisma.binLocation.update.mockResolvedValue({})
      await service.deleteBin(ORG, 'wh-1', 'bin-1')
      expect(prisma.binLocation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deleted_at: expect.any(Date) }) }),
      )
    })
  })
})
