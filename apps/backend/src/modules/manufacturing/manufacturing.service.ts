import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'
import type { CreateBOMDto } from './dto/create-bom.dto'
import type { CreateWorkOrderDto } from './dto/create-work-order.dto'
import type { RecordLaborDto } from './dto/record-labor.dto'
import type { RecordScrapDto } from './dto/record-scrap.dto'

@Injectable()
export class ManufacturingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  // ─── BOMs ─────────────────────────────────────────────────────────────────

  async listBOMs(orgId: string, productId?: string) {
    return this.prisma.billOfMaterials.findMany({
      where: { org_id: orgId, deleted_at: null, ...(productId && { product_id: productId }) },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getBOM(orgId: string, id: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        versions: {
          include: {
            lines: {
              include: {
                component: { select: { id: true, sku: true, name: true } },
                uom: { select: { id: true, abbreviation: true } },
              },
              orderBy: { sort_order: 'asc' },
            },
          },
          orderBy: { version_number: 'desc' },
        },
      },
    })
    if (!bom) throw new NotFoundException('BOM not found')
    return bom
  }

  async createBOM(orgId: string, userId: string, dto: CreateBOMDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.product_id, org_id: orgId, deleted_at: null } })
    if (!product) throw new NotFoundException('Product not found')
    if (!product.is_manufactured) throw new BadRequestException('Product must have is_manufactured=true')

    return this.prisma.$transaction(async (tx) => {
      const bom = await tx.billOfMaterials.create({
        data: {
          org_id: orgId,
          product_id: dto.product_id,
          name: dto.name,
          description: dto.description,
          created_by: userId,
        },
      })

      const version = await tx.bOMVersion.create({
        data: {
          bom_id: bom.id,
          org_id: orgId,
          version_number: 1,
          is_active: true,
          notes: dto.notes,
          activated_at: new Date(),
          lines: {
            create: dto.lines.map((l, i) => ({
              org_id: orgId,
              component_id: l.component_id,
              quantity: l.quantity,
              uom_id: l.uom_id,
              scrap_pct: l.scrap_pct ?? 0,
              substitute_id: l.substitute_id,
              is_phantom: l.is_phantom ?? false,
              notes: l.notes,
              sort_order: l.sort_order ?? i,
            })),
          },
        },
      })

      await tx.billOfMaterials.update({ where: { id: bom.id }, data: { active_version_id: version.id } })

      return tx.billOfMaterials.findUnique({ where: { id: bom.id }, include: { versions: { include: { lines: true } } } })
    })
  }

  async createBOMVersion(orgId: string, bomId: string, userId: string, dto: Omit<CreateBOMDto, 'product_id' | 'name'>) {
    const bom = await this.prisma.billOfMaterials.findFirst({ where: { id: bomId, org_id: orgId, deleted_at: null } })
    if (!bom) throw new NotFoundException('BOM not found')

    const latestVersion = await this.prisma.bOMVersion.findFirst({
      where: { bom_id: bomId },
      orderBy: { version_number: 'desc' },
    })

    const newVersionNumber = (latestVersion?.version_number ?? 0) + 1

    return this.prisma.bOMVersion.create({
      data: {
        bom_id: bomId,
        org_id: orgId,
        version_number: newVersionNumber,
        is_active: false,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((l, i) => ({
            org_id: orgId,
            component_id: l.component_id,
            quantity: l.quantity,
            uom_id: l.uom_id,
            scrap_pct: l.scrap_pct ?? 0,
            substitute_id: l.substitute_id,
            is_phantom: l.is_phantom ?? false,
            notes: l.notes,
            sort_order: l.sort_order ?? i,
          })),
        },
      },
      include: { lines: true },
    })
  }

  async activateBOMVersion(orgId: string, bomId: string, versionId: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({ where: { id: bomId, org_id: orgId, deleted_at: null } })
    if (!bom) throw new NotFoundException('BOM not found')

    const version = await this.prisma.bOMVersion.findFirst({ where: { id: versionId, bom_id: bomId } })
    if (!version) throw new NotFoundException('BOM version not found')

    return this.prisma.$transaction(async (tx) => {
      await tx.bOMVersion.updateMany({ where: { bom_id: bomId }, data: { is_active: false } })
      await tx.bOMVersion.update({ where: { id: versionId }, data: { is_active: true, activated_at: new Date() } })
      await tx.billOfMaterials.update({ where: { id: bomId }, data: { active_version_id: versionId } })
    })
  }

  // ─── Work Orders ──────────────────────────────────────────────────────────

  async listWOs(orgId: string, status?: string) {
    return this.prisma.workOrder.findMany({
      where: { org_id: orgId, deleted_at: null, ...(status && { status: status as any }) },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        bom_version: { select: { id: true, version_number: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getWO(orgId: string, id: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        product: true,
        bom_version: {
          include: {
            lines: {
              include: { component: { select: { id: true, sku: true, name: true } } },
              orderBy: { sort_order: 'asc' },
            },
          },
        },
        material_lines: true,
        labor_entries: true,
        scrap_entries: true,
      },
    })
    if (!wo) throw new NotFoundException('Work order not found')
    return wo
  }

  async createWO(orgId: string, userId: string, dto: CreateWorkOrderDto) {
    const product = await this.prisma.product.findFirst({ where: { id: dto.product_id, org_id: orgId, deleted_at: null } })
    if (!product) throw new NotFoundException('Product not found')

    const bomVersion = await this.prisma.bOMVersion.findFirst({ where: { id: dto.bom_version_id, org_id: orgId } })
    if (!bomVersion) throw new NotFoundException('BOM version not found')

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouse_id, org_id: orgId, deleted_at: null } })
    if (!warehouse) throw new NotFoundException('Warehouse not found')

    const woNumber = await this.nextDocumentNumber(orgId, 'WO')

    const bomLines = await this.prisma.bOMLine.findMany({ where: { bom_version_id: dto.bom_version_id } })

    return this.prisma.workOrder.create({
      data: {
        org_id: orgId,
        wo_number: woNumber,
        product_id: dto.product_id,
        bom_version_id: dto.bom_version_id,
        warehouse_id: dto.warehouse_id,
        status: 'DRAFT',
        quantity_planned: dto.quantity_planned,
        quantity_produced: 0,
        quantity_scrapped: 0,
        planned_cost_cents: bomVersion.standard_cost_cents * BigInt(Math.round(dto.quantity_planned)),
        scheduled_start: dto.scheduled_start ? new Date(dto.scheduled_start) : null,
        scheduled_end: dto.scheduled_end ? new Date(dto.scheduled_end) : null,
        notes: dto.notes,
        created_by: userId,
        updated_by: userId,
        material_lines: {
          create: bomLines.map((l: any) => ({
            bom_line_id: l.id,
            quantity_planned: Number(l.quantity) * dto.quantity_planned * (1 + Number(l.scrap_pct) / 100),
            quantity_consumed: 0,
            uom_id: l.uom_id,
          })),
        },
      },
      include: { material_lines: true },
    })
  }

  async updateWOStatus(orgId: string, userId: string, id: string, action: string) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!wo) throw new NotFoundException('Work order not found')

    const transitions: Record<string, { from: string[]; to: string; extra?: Record<string, any> }> = {
      release:   { from: ['DRAFT'], to: 'RELEASED' },
      start:     { from: ['RELEASED'], to: 'IN_PROGRESS', extra: { actual_start: new Date() } },
      cancel:    { from: ['DRAFT', 'RELEASED'], to: 'CANCELLED' },
    }

    const transition = transitions[action]
    if (!transition) throw new BadRequestException(`Unknown action "${action}"`)
    if (!transition.from.includes(wo.status)) {
      throw new BadRequestException(`Cannot ${action} a work order in status ${wo.status}`)
    }

    if (action === 'release') {
      await this.checkMaterialAvailability(orgId, id, wo.warehouse_id)
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: { status: transition.to as any, updated_by: userId, ...transition.extra },
    })
  }

  async completeWO(orgId: string, userId: string, id: string, qcPassed: boolean, qcNotes?: string) {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: { material_lines: { include: { bom_line: true } } },
    })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.status !== 'IN_PROGRESS') throw new BadRequestException('Work order must be IN_PROGRESS to complete')

    return this.prisma.$transaction(async (tx) => {
      // Consume materials from inventory
      let totalMaterialCost = BigInt(0)
      for (const ml of wo.material_lines) {
        if (Number(ml.quantity_consumed) > 0) {
          await this.ledger.writeEntry(tx as any, {
            orgId,
            productId: ml.bom_line.component_id,
            warehouseId: wo.warehouse_id,
            lotId: ml.lot_id ?? undefined,
            movementType: 'PRODUCTION_CONSUMPTION',
            quantity: -Number(ml.quantity_consumed),
            unitCostCents: BigInt(0),
            referenceType: 'WORK_ORDER',
            referenceId: wo.id,
            createdBy: userId,
          })
        }
      }

      // Add finished goods to inventory
      const laborCost = await (tx as any).workOrderLaborEntry.aggregate({
        where: { wo_id: id },
        _sum: { total_cents: true },
      })
      const laborCostTotal = BigInt(laborCost._sum.total_cents ?? 0)
      const unitCost = Number(wo.quantity_produced) > 0
        ? (totalMaterialCost + laborCostTotal) / BigInt(Math.max(1, Math.round(Number(wo.quantity_produced))))
        : BigInt(0)

      await this.ledger.writeEntry(tx as any, {
        orgId,
        productId: wo.product_id,
        warehouseId: wo.warehouse_id,
        movementType: 'PRODUCTION_OUTPUT',
        quantity: Number(wo.quantity_produced),
        unitCostCents: unitCost,
        referenceType: 'WORK_ORDER',
        referenceId: wo.id,
        createdBy: userId,
      })

      return (tx as any).workOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actual_end: new Date(),
          qc_passed: qcPassed,
          qc_notes: qcNotes,
          actual_cost_cents: totalMaterialCost + laborCostTotal,
          updated_by: userId,
        },
      })
    })
  }

  async recordMaterialConsumption(orgId: string, woId: string, materialLineId: string, quantity: number) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id: woId, org_id: orgId, deleted_at: null } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.status !== 'IN_PROGRESS') throw new BadRequestException('Work order must be IN_PROGRESS')

    return this.prisma.workOrderMaterialLine.update({
      where: { id: materialLineId },
      data: { quantity_consumed: { increment: quantity } },
    })
  }

  async recordProducedQty(orgId: string, woId: string, quantity: number) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id: woId, org_id: orgId, deleted_at: null } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.status !== 'IN_PROGRESS') throw new BadRequestException('Work order must be IN_PROGRESS')

    return this.prisma.workOrder.update({
      where: { id: woId },
      data: { quantity_produced: { increment: quantity } },
    })
  }

  async recordLabor(orgId: string, userId: string, woId: string, dto: RecordLaborDto) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id: woId, org_id: orgId, deleted_at: null } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (!['RELEASED', 'IN_PROGRESS'].includes(wo.status)) throw new BadRequestException('Work order must be RELEASED or IN_PROGRESS')

    const total = BigInt(Math.round(dto.hours * dto.rate_cents))

    return this.prisma.workOrderLaborEntry.create({
      data: {
        wo_id: woId,
        org_id: orgId,
        hours: dto.hours,
        rate_cents: BigInt(Math.round(dto.rate_cents)),
        total_cents: total,
        recorded_by: userId,
        recorded_at: new Date(dto.recorded_at),
        notes: dto.notes,
      },
    })
  }

  async recordScrap(orgId: string, userId: string, woId: string, dto: RecordScrapDto) {
    const wo = await this.prisma.workOrder.findFirst({ where: { id: woId, org_id: orgId, deleted_at: null } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.status !== 'IN_PROGRESS') throw new BadRequestException('Work order must be IN_PROGRESS')

    await this.prisma.workOrder.update({
      where: { id: woId },
      data: { quantity_scrapped: { increment: dto.quantity } },
    })

    return this.prisma.workOrderScrapEntry.create({
      data: {
        wo_id: woId,
        org_id: orgId,
        quantity: dto.quantity,
        reason_code: dto.reason_code,
        disposition: dto.disposition,
        notes: dto.notes,
        created_by: userId,
      },
    })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async checkMaterialAvailability(orgId: string, woId: string, warehouseId: string) {
    const materialLines = await this.prisma.workOrderMaterialLine.findMany({
      where: { wo_id: woId },
      include: { bom_line: true },
    })

    for (const ml of materialLines) {
      const stock = await this.prisma.inventoryLedgerEntry.groupBy({
        by: ['product_id'],
        where: { org_id: orgId, product_id: ml.bom_line.component_id, warehouse_id: warehouseId },
        _sum: { quantity: true },
      })
      const qtyOnHand = Number(stock[0]?._sum.quantity ?? 0)
      if (qtyOnHand < Number(ml.quantity_planned)) {
        const product = await this.prisma.product.findUnique({ where: { id: ml.bom_line.component_id }, select: { name: true } })
        throw new BadRequestException(
          `Insufficient stock for ${product?.name}: need ${Number(ml.quantity_planned)}, have ${qtyOnHand}`,
        )
      }
    }
  }

  private async nextDocumentNumber(orgId: string, docType: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const seq = await (tx as any).documentSequence.findUniqueOrThrow({
        where: { org_id_document_type: { org_id: orgId, document_type: docType } },
      })
      await (tx as any).documentSequence.update({
        where: { org_id_document_type: { org_id: orgId, document_type: docType } },
        data: { next_number: { increment: 1 } },
      })
      return `${seq.prefix}${String(seq.next_number).padStart(seq.zero_pad_length, '0')}`
    })
  }
}
