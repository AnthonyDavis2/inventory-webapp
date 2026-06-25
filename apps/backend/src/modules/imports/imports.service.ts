import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'
import { QueueService } from '../../core/queue/queue.service'

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
  ) {}

  /** Get a presigned upload URL; the actual processing starts once the client confirms upload. */
  async initiateImport(orgId: string, userId: string, entityType: string, filename: string) {
    const key = `orgs/${orgId}/imports/${Date.now()}-${filename}`
    const uploadUrl = await this.storage.getSignedUploadUrl(key, 'text/csv', 300)

    const batch = await this.prisma.importBatch.create({
      data: {
        org_id: orgId,
        entity_type: entityType as any,
        status: 'PENDING',
        original_filename: filename,
        storage_key: key,
        created_by: userId,
      },
    })

    return { batch_id: batch.id, upload_url: uploadUrl, key }
  }

  /** Called by client after the file has been uploaded to R2. Queues the validation job. */
  async confirmUpload(orgId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({ where: { id: batchId, org_id: orgId } })
    if (!batch) throw new NotFoundException('Import batch not found')
    if (batch.status !== 'PENDING') throw new BadRequestException('Import batch is not in PENDING status')

    await this.queue.add('imports', 'validate', { batchId, orgId })

    return this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'VALIDATING' },
    })
  }

  /** Client confirms they want to proceed after reviewing the preview. Queues the import job. */
  async confirmImport(orgId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({ where: { id: batchId, org_id: orgId } })
    if (!batch) throw new NotFoundException('Import batch not found')
    if (batch.status !== 'PREVIEW_READY') throw new BadRequestException('Import batch is not ready for import')

    await this.queue.add('imports', 'process', { batchId, orgId })

    return this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    })
  }

  async getBatch(orgId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({ where: { id: batchId, org_id: orgId } })
    if (!batch) throw new NotFoundException('Import batch not found')
    return batch
  }

  async listBatches(orgId: string) {
    return this.prisma.importBatch.findMany({
      where: { org_id: orgId },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
  }

  async rollback(orgId: string, batchId: string, userId: string) {
    const batch = await this.prisma.importBatch.findFirst({ where: { id: batchId, org_id: orgId } })
    if (!batch) throw new NotFoundException('Import batch not found')
    if (batch.status !== 'COMPLETED') throw new BadRequestException('Only completed imports can be rolled back')
    if (batch.rolled_back_at) throw new BadRequestException('This import has already been rolled back')
    if (batch.rollback_expires_at && batch.rollback_expires_at < new Date()) {
      throw new BadRequestException('The rollback window has expired')
    }

    // Actual rollback logic would be entity-specific; this marks it and queues the rollback job
    await this.queue.add('imports', 'rollback', { batchId, orgId, userId })

    return this.prisma.importBatch.update({
      where: { id: batchId },
      data: { rolled_back_at: new Date() },
    })
  }

  /** Return a CSV template for the given entity type. */
  getTemplate(entityType: string): string {
    const templates: Record<string, string> = {
      PRODUCTS: 'sku,name,type,description,purchase_uom,stocking_uom,sales_uom,is_purchasable,is_sellable,is_manufactured,is_lot_tracked,is_serial_tracked',
      RAW_MATERIALS: 'sku,name,description,stocking_uom,is_lot_tracked',
      VENDORS: 'name,code,email,phone,address_line1,city,state,zip,payment_terms,lead_time_days',
      CUSTOMERS: 'name,code,type,email,phone,address_line1,city,state,zip,payment_terms,credit_limit',
      OPENING_INVENTORY: 'sku,warehouse_code,quantity,unit_cost,lot_number,expires_at',
    }

    const template = templates[entityType]
    if (!template) throw new BadRequestException(`Unknown entity type: ${entityType}`)
    return template
  }
}
