import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ImportsService } from './imports.service'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'
import { QueueService } from '../../core/queue/queue.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

function buildMockPrisma() {
  return {
    importBatch: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  }
}

describe('ImportsService', () => {
  let service: ImportsService
  let prisma: ReturnType<typeof buildMockPrisma>
  let storage: { getSignedUploadUrl: jest.Mock }
  let queue: { add: jest.Mock }

  beforeEach(async () => {
    prisma = buildMockPrisma()
    storage = { getSignedUploadUrl: jest.fn().mockResolvedValue('https://r2.example.com/presigned') }
    queue = { add: jest.fn().mockResolvedValue(undefined) }

    const module = await Test.createTestingModule({
      providers: [
        ImportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: QueueService, useValue: queue },
      ],
    }).compile()

    service = module.get(ImportsService)
  })

  describe('initiateImport', () => {
    it('creates a PENDING import batch and returns upload URL', async () => {
      const mockBatch = { id: 'batch-1', org_id: ORG, status: 'PENDING', entity_type: 'PRODUCTS' }
      prisma.importBatch.create.mockResolvedValue(mockBatch)

      const result = await service.initiateImport(ORG, USER, 'PRODUCTS', 'products.csv')

      expect(result.batch_id).toBe('batch-1')
      expect(result.upload_url).toBe('https://r2.example.com/presigned')
      expect(prisma.importBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', entity_type: 'PRODUCTS' }) }),
      )
    })
  })

  describe('confirmUpload', () => {
    it('queues validation job and updates status to VALIDATING', async () => {
      const mockBatch = { id: 'batch-1', org_id: ORG, status: 'PENDING' }
      prisma.importBatch.findFirst.mockResolvedValue(mockBatch)
      prisma.importBatch.update.mockResolvedValue({ ...mockBatch, status: 'VALIDATING' })

      await service.confirmUpload(ORG, 'batch-1')

      expect(queue.add).toHaveBeenCalledWith('imports', 'validate', { batchId: 'batch-1', orgId: ORG })
      expect(prisma.importBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'VALIDATING' } }),
      )
    })

    it('throws NotFoundException when batch not found', async () => {
      prisma.importBatch.findFirst.mockResolvedValue(null)
      await expect(service.confirmUpload(ORG, 'ghost')).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when batch is not PENDING', async () => {
      prisma.importBatch.findFirst.mockResolvedValue({ id: 'batch-1', org_id: ORG, status: 'VALIDATING' })
      await expect(service.confirmUpload(ORG, 'batch-1')).rejects.toThrow(BadRequestException)
    })
  })

  describe('confirmImport', () => {
    it('throws BadRequestException when batch is not PREVIEW_READY', async () => {
      prisma.importBatch.findFirst.mockResolvedValue({ id: 'batch-1', org_id: ORG, status: 'VALIDATING' })
      await expect(service.confirmImport(ORG, 'batch-1')).rejects.toThrow(BadRequestException)
    })

    it('queues import job and updates status to PROCESSING', async () => {
      const mockBatch = { id: 'batch-1', org_id: ORG, status: 'PREVIEW_READY' }
      prisma.importBatch.findFirst.mockResolvedValue(mockBatch)
      prisma.importBatch.update.mockResolvedValue({ ...mockBatch, status: 'PROCESSING' })

      await service.confirmImport(ORG, 'batch-1')

      expect(queue.add).toHaveBeenCalledWith('imports', 'process', { batchId: 'batch-1', orgId: ORG })
    })
  })
})
