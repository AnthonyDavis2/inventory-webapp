import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ManufacturingService } from './manufacturing.service'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

const mockProduct = { id: 'prod-1', org_id: ORG, sku: 'WIDGET', name: 'Widget', is_manufactured: true, deleted_at: null }
const mockBOM = {
  id: 'bom-1', org_id: ORG, product_id: 'prod-1', name: 'Widget BOM', active_version_id: 'ver-1', deleted_at: null,
  versions: [{ id: 'ver-1', version_number: 1, is_active: true, lines: [] }],
}
const mockWorkOrder = {
  id: 'wo-1', org_id: ORG, wo_number: 'WO-00001', product_id: 'prod-1', bom_version_id: 'ver-1',
  warehouse_id: 'wh-1', status: 'RELEASED', quantity_planned: 10, quantity_produced: 0, deleted_at: null,
  bom_version: { lines: [{ component_id: 'comp-1', quantity: 2, uom_id: 'uom-1' }] },
}

function buildMockPrisma() {
  return {
    product: { findFirst: jest.fn() },
    billOfMaterials: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    bOMVersion: { create: jest.fn(), findFirst: jest.fn() },
    bOMLine: { findFirst: jest.fn() },
    workOrder: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    workOrderMaterialLine: { create: jest.fn(), findMany: jest.fn() },
    workOrderLaborLine: { create: jest.fn() },
    workOrderScrapLine: { create: jest.fn() },
    documentSequence: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  }
}

describe('ManufacturingService', () => {
  let service: ManufacturingService
  let prisma: ReturnType<typeof buildMockPrisma>
  let ledger: { writeEntry: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    ledger = { writeEntry: jest.fn() }

    const module = await Test.createTestingModule({
      providers: [
        ManufacturingService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryLedgerService, useValue: ledger },
      ],
    }).compile()

    service = module.get(ManufacturingService)
  })

  describe('getBOM', () => {
    it('returns BOM when found', async () => {
      prisma.billOfMaterials.findFirst.mockResolvedValue(mockBOM)
      const result = await service.getBOM(ORG, 'bom-1')
      expect(result.id).toBe('bom-1')
    })

    it('throws NotFoundException when BOM missing', async () => {
      prisma.billOfMaterials.findFirst.mockResolvedValue(null)
      await expect(service.getBOM(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createBOM', () => {
    it('throws NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null)
      await expect(service.createBOM(ORG, USER, { product_id: 'bad', name: 'X', lines: [] } as any)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when product is not manufactured', async () => {
      prisma.product.findFirst.mockResolvedValue({ ...mockProduct, is_manufactured: false })
      await expect(service.createBOM(ORG, USER, { product_id: 'prod-1', name: 'X', lines: [] } as any)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getWO', () => {
    it('returns work order when found', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ ...mockWorkOrder, bom_version: { lines: [] } })
      const result = await service.getWO(ORG, 'wo-1')
      expect(result.wo_number).toBe('WO-00001')
    })

    it('throws NotFoundException when WO missing', async () => {
      prisma.workOrder.findFirst.mockResolvedValue(null)
      await expect(service.getWO(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateWOStatus — release', () => {
    it('throws BadRequestException when WO is not in DRAFT', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ ...mockWorkOrder, status: 'RELEASED' })
      await expect(service.updateWOStatus(ORG, USER, 'wo-1', 'release')).rejects.toThrow(BadRequestException)
    })
  })

  describe('updateWOStatus — cancel', () => {
    it('throws BadRequestException when WO is already CLOSED', async () => {
      prisma.workOrder.findFirst.mockResolvedValue({ ...mockWorkOrder, status: 'CLOSED' })
      await expect(service.updateWOStatus(ORG, USER, 'wo-1', 'cancel')).rejects.toThrow(BadRequestException)
    })
  })
})
