import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'
import type { CreatePODto } from './dto/create-po.dto'
import type { CreateReceiptDto } from './dto/create-receipt.dto'
import type { AddLandedCostDto } from './dto/add-landed-cost.dto'

const OPEN_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED'] as const

@Injectable()
export class PurchasingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  // ─── PO lifecycle ─────────────────────────────────────────────────────────

  async listPOs(orgId: string, status?: string, vendorId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(status && { status: status as any }),
        ...(vendorId && { vendor_id: vendorId }),
      },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true, receipts: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getPO(orgId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        vendor: { select: { id: true, name: true, code: true, payment_terms: true } },
        lines: {
          include: { product: { select: { id: true, sku: true, name: true } } },
          orderBy: { created_at: 'asc' },
        },
        receipts: {
          where: { deleted_at: null },
          include: { _count: { select: { lines: true } } },
          orderBy: { received_at: 'desc' },
        },
      },
    })
    if (!po) throw new NotFoundException('Purchase order not found')
    return po
  }

  async createPO(orgId: string, userId: string, dto: CreatePODto) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendor_id, org_id: orgId, deleted_at: null } })
    if (!vendor) throw new NotFoundException('Vendor not found')

    const poNumber = await this.nextDocumentNumber(orgId, 'PO')

    return this.prisma.$transaction(async (tx) => {
      let subtotal = BigInt(0)

      const lineData = await Promise.all(dto.lines.map(async (line) => {
        const product = await tx.product.findFirst({ where: { id: line.product_id, org_id: orgId, deleted_at: null } })
        if (!product) throw new NotFoundException(`Product ${line.product_id} not found`)

        const total = BigInt(Math.round(line.quantity_ordered * line.unit_cost_cents))
        subtotal += total

        return {
          org_id: orgId,
          product_id: line.product_id,
          quantity_ordered: line.quantity_ordered,
          quantity_received: 0,
          uom_id: line.uom_id,
          unit_cost_cents: BigInt(Math.round(line.unit_cost_cents)),
          total_cost_cents: total,
          expected_date: line.expected_date ? new Date(line.expected_date) : null,
          notes: line.notes,
        }
      }))

      return tx.purchaseOrder.create({
        data: {
          org_id: orgId,
          po_number: poNumber,
          vendor_id: dto.vendor_id,
          status: 'DRAFT',
          payment_terms: dto.payment_terms ?? vendor.payment_terms,
          expected_date: dto.expected_date ? new Date(dto.expected_date) : null,
          notes: dto.notes,
          internal_notes: dto.internal_notes,
          subtotal_cents: subtotal,
          total_cents: subtotal,
          created_by: userId,
          updated_by: userId,
          lines: { create: lineData },
        },
        include: { lines: true },
      })
    })
  }

  async updatePOStatus(orgId: string, userId: string, id: string, action: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!po) throw new NotFoundException('Purchase order not found')

    const transitions: Record<string, { from: string[]; to: string; extra?: Record<string, any> }> = {
      submit:   { from: ['DRAFT'], to: 'PENDING_APPROVAL' },
      approve:  { from: ['PENDING_APPROVAL'], to: 'APPROVED', extra: { approved_by: userId, approved_at: new Date() } },
      send:     { from: ['APPROVED'], to: 'SENT', extra: { sent_at: new Date() } },
      cancel:   { from: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'], to: 'CANCELLED', extra: { cancelled_at: new Date() } },
      reopen:   { from: ['CANCELLED'], to: 'DRAFT', extra: { cancelled_at: null, cancelled_reason: null } },
    }

    const transition = transitions[action]
    if (!transition) throw new BadRequestException(`Unknown action "${action}"`)
    if (!transition.from.includes(po.status)) {
      throw new BadRequestException(`Cannot ${action} a PO in status ${po.status}`)
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: transition.to as any, updated_by: userId, ...transition.extra },
    })
  }

  async deletePO(orgId: string, userId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!po) throw new NotFoundException('Purchase order not found')
    if (po.status !== 'DRAFT') throw new ForbiddenException('Only DRAFT purchase orders can be deleted')

    await this.prisma.purchaseOrder.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: userId } })
  }

  // ─── Receiving ────────────────────────────────────────────────────────────

  async listReceipts(orgId: string, poId: string) {
    await this.assertPOAccess(orgId, poId)
    return this.prisma.receipt.findMany({
      where: { org_id: orgId, po_id: poId, deleted_at: null },
      include: {
        lines: {
          include: { po_line: { include: { product: { select: { id: true, sku: true, name: true } } } } },
        },
        landed_costs: true,
      },
      orderBy: { received_at: 'desc' },
    })
  }

  async createReceipt(orgId: string, userId: string, poId: string, dto: CreateReceiptDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, org_id: orgId, deleted_at: null },
      include: { lines: true },
    })
    if (!po) throw new NotFoundException('Purchase order not found')
    if (!OPEN_STATUSES.includes(po.status as any)) {
      throw new BadRequestException(`Cannot receive against a PO in status ${po.status}`)
    }

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouse_id, org_id: orgId, deleted_at: null } })
    if (!warehouse) throw new NotFoundException('Warehouse not found')

    const receiptNumber = await this.nextDocumentNumber(orgId, 'RECEIPT')

    return this.prisma.$transaction(async (tx) => {
      // Validate each receipt line against its PO line
      for (const line of dto.lines) {
        const poLine = po.lines.find((l) => l.id === line.po_line_id)
        if (!poLine) throw new NotFoundException(`PO line ${line.po_line_id} not found on this PO`)

        const alreadyReceived = Number(poLine.quantity_received)
        const remaining = Number(poLine.quantity_ordered) - alreadyReceived
        if (line.quantity_received > remaining) {
          throw new BadRequestException(
            `Over-receive on line ${line.po_line_id}: ordered ${Number(poLine.quantity_ordered)}, already received ${alreadyReceived}, trying to receive ${line.quantity_received}`,
          )
        }
      }

      const receipt = await (tx as any).receipt.create({
        data: {
          org_id: orgId,
          receipt_number: receiptNumber,
          po_id: poId,
          warehouse_id: dto.warehouse_id,
          received_at: new Date(dto.received_at),
          notes: dto.notes,
          created_by: userId,
          lines: {
            create: dto.lines.map((line) => ({
              org_id: orgId,
              po_line_id: line.po_line_id,
              quantity_received: line.quantity_received,
              uom_id: po.lines.find((l) => l.id === line.po_line_id)!.uom_id,
              unit_cost_cents: BigInt(Math.round(line.unit_cost_cents)),
              bin_location_id: line.bin_location_id,
              lot_id: line.lot_id,
              serial_number_ids: line.serial_number_ids ?? [],
            })),
          },
        },
        include: { lines: true },
      })

      // Post ledger entries for each received line
      for (const line of dto.lines) {
        const poLine = po.lines.find((l) => l.id === line.po_line_id)!

        await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: poLine.product_id,
          warehouseId: dto.warehouse_id,
          binLocationId: line.bin_location_id,
          lotId: line.lot_id,
          movementType: 'PURCHASE_RECEIPT',
          quantity: line.quantity_received,
          unitCostCents: BigInt(Math.round(line.unit_cost_cents)),
          referenceType: 'RECEIPT',
          referenceId: receipt.id,
          createdBy: userId,
        })

        // Update quantity_received on PO line
        await (tx as any).purchaseOrderLine.update({
          where: { id: line.po_line_id },
          data: { quantity_received: { increment: line.quantity_received } },
        })
      }

      // Update PO status based on total receipt quantities
      const updatedLines = await (tx as any).purchaseOrderLine.findMany({ where: { po_id: poId } })
      const allReceived = updatedLines.every(
        (l: any) => Number(l.quantity_received) >= Number(l.quantity_ordered),
      )
      await (tx as any).purchaseOrder.update({
        where: { id: poId },
        data: { status: allReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED', updated_by: userId },
      })

      return receipt
    })
  }

  async postReceipt(orgId: string, userId: string, poId: string, receiptId: string) {
    const receipt = await this.prisma.receipt.findFirst({ where: { id: receiptId, po_id: poId, org_id: orgId } })
    if (!receipt) throw new NotFoundException('Receipt not found')
    if (receipt.posted_at) throw new BadRequestException('Receipt is already posted')

    return this.prisma.receipt.update({
      where: { id: receiptId },
      data: { posted_at: new Date(), posted_by: userId },
    })
  }

  // ─── Landed Costs ─────────────────────────────────────────────────────────

  async addLandedCost(orgId: string, poId: string, receiptId: string, dto: AddLandedCostDto) {
    const receipt = await this.prisma.receipt.findFirst({ where: { id: receiptId, po_id: poId, org_id: orgId } })
    if (!receipt) throw new NotFoundException('Receipt not found')

    return this.prisma.landedCost.create({
      data: {
        org_id: orgId,
        receipt_id: receiptId,
        type: dto.type,
        amount_cents: BigInt(Math.round(dto.amount_cents)),
        description: dto.description,
      },
    })
  }

  async deleteLandedCost(orgId: string, poId: string, receiptId: string, landedCostId: string) {
    const receipt = await this.prisma.receipt.findFirst({ where: { id: receiptId, po_id: poId, org_id: orgId } })
    if (!receipt) throw new NotFoundException('Receipt not found')
    if (receipt.posted_at) throw new BadRequestException('Cannot remove landed costs from a posted receipt')

    const lc = await this.prisma.landedCost.findFirst({ where: { id: landedCostId, receipt_id: receiptId } })
    if (!lc) throw new NotFoundException('Landed cost not found')
    await this.prisma.landedCost.delete({ where: { id: landedCostId } })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertPOAccess(orgId: string, poId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id: poId, org_id: orgId, deleted_at: null } })
    if (!po) throw new NotFoundException('Purchase order not found')
    return po
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
