import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from '../inventory/inventory-ledger.service'
import type { CreateQuoteDto } from './dto/create-quote.dto'
import type { CreateSalesOrderDto } from './dto/create-sales-order.dto'
import type { CreateShipmentDto } from './dto/create-shipment.dto'
import type { CreateRmaDto } from './dto/create-rma.dto'

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  // ─── Quotes ───────────────────────────────────────────────────────────────

  async listQuotes(orgId: string, status?: string, customerId?: string) {
    return this.prisma.quote.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(status && { status: status as any }),
        ...(customerId && { customer_id: customerId }),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getQuote(orgId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        lines: {
          include: { product: { select: { id: true, sku: true, name: true } } },
          orderBy: { sort_order: 'asc' },
        },
      },
    })
    if (!quote) throw new NotFoundException('Quote not found')
    return quote
  }

  async createQuote(orgId: string, userId: string, dto: CreateQuoteDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customer_id, org_id: orgId, deleted_at: null } })
    if (!customer) throw new NotFoundException('Customer not found')

    const quoteNumber = await this.nextDocumentNumber(orgId, 'QUOTE')
    const { subtotal, tax, total, lineData } = this.calcLines(dto.lines as any[], orgId)

    return this.prisma.quote.create({
      data: {
        org_id: orgId,
        quote_number: quoteNumber,
        customer_id: dto.customer_id,
        status: 'DRAFT',
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
        notes: dto.notes,
        internal_notes: dto.internal_notes,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        created_by: userId,
        updated_by: userId,
        lines: { create: lineData },
      },
      include: { lines: true },
    })
  }

  async updateQuoteStatus(orgId: string, userId: string, id: string, action: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!quote) throw new NotFoundException('Quote not found')

    const transitions: Record<string, { from: string[]; to: string; extra?: Record<string, any> }> = {
      send:   { from: ['DRAFT'], to: 'SENT', extra: { sent_at: new Date() } },
      accept: { from: ['SENT'], to: 'ACCEPTED' },
      reject: { from: ['SENT'], to: 'REJECTED' },
    }

    const transition = transitions[action]
    if (!transition) throw new BadRequestException(`Unknown action "${action}"`)
    if (!transition.from.includes(quote.status)) {
      throw new BadRequestException(`Cannot ${action} a quote in status ${quote.status}`)
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: transition.to as any, updated_by: userId, ...transition.extra },
    })
  }

  async convertQuoteToSO(orgId: string, userId: string, quoteId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, org_id: orgId, deleted_at: null },
      include: { lines: true },
    })
    if (!quote) throw new NotFoundException('Quote not found')
    if (!['DRAFT', 'SENT', 'ACCEPTED'].includes(quote.status)) {
      throw new BadRequestException(`Cannot convert a quote in status ${quote.status} to a sales order`)
    }

    const soNumber = await this.nextDocumentNumber(orgId, 'SO')

    return this.prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.create({
        data: {
          org_id: orgId,
          order_number: soNumber,
          customer_id: quote.customer_id,
          quote_id: quoteId,
          status: 'DRAFT',
          fulfillment_status: 'UNFULFILLED',
          payment_terms: 'NET30',
          subtotal_cents: quote.subtotal_cents,
          tax_cents: quote.tax_cents,
          total_cents: quote.total_cents,
          notes: quote.notes,
          created_by: userId,
          updated_by: userId,
          lines: {
            create: quote.lines.map((l) => ({
              org_id: orgId,
              product_id: l.product_id,
              description: l.description,
              quantity_ordered: l.quantity,
              quantity_fulfilled: 0,
              uom_id: l.uom_id,
              unit_price_cents: l.unit_price_cents,
              discount_pct: l.discount_pct,
              tax_pct: l.tax_pct,
              tax_cents: l.tax_cents,
              total_cents: l.total_cents,
              fulfillment_status: 'UNFULFILLED',
              sort_order: l.sort_order,
            })),
          },
        },
        include: { lines: true },
      })

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'CONVERTED', converted_to_so_id: so.id, updated_by: userId },
      })

      return so
    })
  }

  async deleteQuote(orgId: string, userId: string, id: string) {
    const quote = await this.prisma.quote.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!quote) throw new NotFoundException('Quote not found')
    if (!['DRAFT', 'REJECTED', 'EXPIRED'].includes(quote.status)) {
      throw new ForbiddenException('Only DRAFT, REJECTED, or EXPIRED quotes can be deleted')
    }
    await this.prisma.quote.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: userId } })
  }

  // ─── Sales Orders ─────────────────────────────────────────────────────────

  async listSOs(orgId: string, status?: string, customerId?: string) {
    return this.prisma.salesOrder.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(status && { status: status as any }),
        ...(customerId && { customer_id: customerId }),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true, shipments: true, invoices: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getSO(orgId: string, id: string) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        customer: true,
        lines: {
          include: { product: { select: { id: true, sku: true, name: true } } },
          orderBy: { sort_order: 'asc' },
        },
        shipments: {
          where: { deleted_at: null },
          include: { lines: true },
          orderBy: { created_at: 'desc' },
        },
        invoices: { where: { deleted_at: null }, select: { id: true, invoice_number: true, status: true, total_cents: true } },
      },
    })
    if (!so) throw new NotFoundException('Sales order not found')
    return so
  }

  async createSO(orgId: string, userId: string, dto: CreateSalesOrderDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customer_id, org_id: orgId, deleted_at: null } })
    if (!customer) throw new NotFoundException('Customer not found')

    const soNumber = await this.nextDocumentNumber(orgId, 'SO')
    const { subtotal, tax, total, lineData } = this.calcLines(dto.lines as any[], orgId)

    return this.prisma.salesOrder.create({
      data: {
        org_id: orgId,
        order_number: soNumber,
        customer_id: dto.customer_id,
        quote_id: dto.quote_id,
        status: 'DRAFT',
        fulfillment_status: 'UNFULFILLED',
        payment_terms: dto.payment_terms ?? customer.payment_terms,
        ship_to_address_id: dto.ship_to_address_id,
        requested_ship_date: dto.requested_ship_date ? new Date(dto.requested_ship_date) : null,
        notes: dto.notes,
        internal_notes: dto.internal_notes,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        created_by: userId,
        updated_by: userId,
        lines: { create: lineData },
      },
      include: { lines: true },
    })
  }

  async updateSOStatus(orgId: string, userId: string, id: string, action: string) {
    const so = await this.prisma.salesOrder.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!so) throw new NotFoundException('Sales order not found')

    const transitions: Record<string, { from: string[]; to: string; extra?: Record<string, any> }> = {
      confirm:  { from: ['DRAFT'], to: 'CONFIRMED', extra: { confirmed_at: new Date() } },
      cancel:   { from: ['DRAFT', 'CONFIRMED'], to: 'CANCELLED', extra: { cancelled_at: new Date() } },
    }

    const transition = transitions[action]
    if (!transition) throw new BadRequestException(`Unknown action "${action}"`)
    if (!transition.from.includes(so.status)) {
      throw new BadRequestException(`Cannot ${action} a sales order in status ${so.status}`)
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: transition.to as any, updated_by: userId, ...transition.extra },
    })
  }

  async deleteSO(orgId: string, userId: string, id: string) {
    const so = await this.prisma.salesOrder.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!so) throw new NotFoundException('Sales order not found')
    if (so.status !== 'DRAFT') throw new ForbiddenException('Only DRAFT sales orders can be deleted')
    await this.prisma.salesOrder.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: userId } })
  }

  // ─── Shipments ────────────────────────────────────────────────────────────

  async createShipment(orgId: string, userId: string, soId: string, dto: CreateShipmentDto) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id: soId, org_id: orgId, deleted_at: null },
      include: { lines: true },
    })
    if (!so) throw new NotFoundException('Sales order not found')
    if (!['CONFIRMED', 'PARTIALLY_FULFILLED'].includes(so.status)) {
      throw new BadRequestException(`Cannot ship from a sales order in status ${so.status}`)
    }

    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: dto.warehouse_id, org_id: orgId, deleted_at: null } })
    if (!warehouse) throw new NotFoundException('Warehouse not found')

    const shipmentNumber = await this.nextDocumentNumber(orgId, 'SHIPMENT')

    return this.prisma.$transaction(async (tx) => {
      for (const line of dto.lines) {
        const soLine = so.lines.find((l) => l.id === line.so_line_id)
        if (!soLine) throw new NotFoundException(`SO line ${line.so_line_id} not found`)

        const remaining = Number(soLine.quantity_ordered) - Number(soLine.quantity_fulfilled)
        if (line.quantity > remaining) {
          throw new BadRequestException(`Over-ship on line ${line.so_line_id}: ${remaining} remaining, trying to ship ${line.quantity}`)
        }
      }

      const shipment = await (tx as any).shipment.create({
        data: {
          org_id: orgId,
          shipment_number: shipmentNumber,
          so_id: soId,
          warehouse_id: dto.warehouse_id,
          carrier: dto.carrier,
          tracking_number: dto.tracking_number,
          shipping_cost_cents: BigInt(Math.round(dto.shipping_cost_cents ?? 0)),
          shipped_at: dto.shipped_at ? new Date(dto.shipped_at) : new Date(),
          notes: dto.notes,
          created_by: userId,
          lines: {
            create: dto.lines.map((l) => ({
              so_line_id: l.so_line_id,
              quantity: l.quantity,
              lot_id: l.lot_id,
              serial_number_id: l.serial_number_id,
              bin_location_id: l.bin_location_id,
            })),
          },
        },
        include: { lines: true },
      })

      // Post ledger entries and update SO line fulfillment
      for (const line of dto.lines) {
        const soLine = so.lines.find((l) => l.id === line.so_line_id)!

        await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: soLine.product_id,
          warehouseId: dto.warehouse_id,
          binLocationId: line.bin_location_id,
          lotId: line.lot_id,
          serialNumberId: line.serial_number_id,
          movementType: 'SALES_SHIPMENT',
          quantity: -line.quantity,
          unitCostCents: BigInt(0), // FIFO cost is resolved by ledger service
          referenceType: 'SHIPMENT',
          referenceId: shipment.id,
          createdBy: userId,
        })

        await (tx as any).salesOrderLine.update({
          where: { id: line.so_line_id },
          data: { quantity_fulfilled: { increment: line.quantity } },
        })
      }

      // Update SO fulfillment status
      const updatedLines = await (tx as any).salesOrderLine.findMany({ where: { so_id: soId } })
      const allFulfilled = updatedLines.every((l: any) => Number(l.quantity_fulfilled) >= Number(l.quantity_ordered))
      const anyFulfilled = updatedLines.some((l: any) => Number(l.quantity_fulfilled) > 0)

      await (tx as any).salesOrder.update({
        where: { id: soId },
        data: {
          status: allFulfilled ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
          fulfillment_status: allFulfilled ? 'FULFILLED' : anyFulfilled ? 'PARTIALLY_FULFILLED' : 'UNFULFILLED',
          updated_by: userId,
        },
      })

      return shipment
    })
  }

  // ─── Returns (RMA) ────────────────────────────────────────────────────────

  async createRma(orgId: string, userId: string, dto: CreateRmaDto) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id: dto.so_id, org_id: orgId, deleted_at: null },
      include: { lines: true },
    })
    if (!so) throw new NotFoundException('Sales order not found')

    const rmaNumber = await this.nextDocumentNumber(orgId, 'RMA')

    return this.prisma.$transaction(async (tx) => {
      const rma = await (tx as any).returnAuthorization.create({
        data: {
          org_id: orgId,
          rma_number: rmaNumber,
          so_id: dto.so_id,
          customer_id: so.customer_id,
          status: 'PENDING',
          reason: dto.reason,
          notes: dto.notes,
          created_by: userId,
          lines: {
            create: dto.lines.map((l) => ({
              so_line_id: l.so_line_id,
              quantity: l.quantity,
              condition: l.condition,
              disposition: l.disposition,
              restock_warehouse_id: l.restock_warehouse_id,
              notes: l.notes,
            })),
          },
        },
        include: { lines: true },
      })
      return rma
    })
  }

  async updateRmaStatus(orgId: string, userId: string, rmaId: string, action: string) {
    const rma = await this.prisma.returnAuthorization.findFirst({
      where: { id: rmaId, org_id: orgId, deleted_at: null },
      include: { lines: true },
    })
    if (!rma) throw new NotFoundException('Return authorization not found')

    if (action === 'approve') {
      if (rma.status !== 'PENDING') throw new BadRequestException('Can only approve a PENDING RMA')
      return this.prisma.returnAuthorization.update({ where: { id: rmaId }, data: { status: 'APPROVED' } })
    }

    if (action === 'receive') {
      if (rma.status !== 'APPROVED') throw new BadRequestException('Can only receive an APPROVED RMA')

      return this.prisma.$transaction(async (tx) => {
        for (const line of rma.lines) {
          if (line.disposition === 'RESTOCK' && line.restock_warehouse_id) {
            const soLine = await (tx as any).salesOrderLine.findUnique({ where: { id: line.so_line_id } })
            await this.ledger.writeEntry(tx as any, {
              orgId,
              productId: soLine.product_id,
              warehouseId: line.restock_warehouse_id,
              movementType: 'SALES_RETURN',
              quantity: Number(line.quantity),
              unitCostCents: BigInt(0),
              referenceType: 'SALES_ORDER',
              referenceId: rma.so_id,
              createdBy: userId,
            })
          }
        }

        return (tx as any).returnAuthorization.update({
          where: { id: rmaId },
          data: { status: 'RECEIVED', received_at: new Date() },
        })
      })
    }

    if (action === 'cancel') {
      if (!['PENDING', 'APPROVED'].includes(rma.status)) throw new BadRequestException('Cannot cancel this RMA')
      return this.prisma.returnAuthorization.update({ where: { id: rmaId }, data: { status: 'CANCELLED' } })
    }

    throw new BadRequestException(`Unknown action "${action}"`)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private calcLines(lines: Array<{ product_id: string; description?: string; quantity_ordered?: number; quantity?: number; uom_id: string; unit_price_cents: number; discount_pct?: number; tax_pct?: number; sort_order?: number }>, orgId: string) {
    let subtotal = BigInt(0)
    let tax = BigInt(0)

    const lineData = lines.map((l, i) => {
      const qty = l.quantity_ordered ?? l.quantity ?? 0
      const discountFactor = 1 - (l.discount_pct ?? 0) / 100
      const lineSubtotal = BigInt(Math.round(qty * l.unit_price_cents * discountFactor))
      const lineTax = BigInt(Math.round(Number(lineSubtotal) * (l.tax_pct ?? 0) / 100))
      subtotal += lineSubtotal
      tax += lineTax

      return {
        org_id: orgId,
        product_id: l.product_id,
        description: l.description,
        quantity: qty,
        quantity_ordered: qty,
        quantity_fulfilled: 0,
        uom_id: l.uom_id,
        unit_price_cents: BigInt(Math.round(l.unit_price_cents)),
        discount_pct: l.discount_pct ?? 0,
        tax_pct: l.tax_pct ?? 0,
        tax_cents: lineTax,
        total_cents: lineSubtotal + lineTax,
        fulfillment_status: 'UNFULFILLED' as const,
        sort_order: l.sort_order ?? i,
      }
    })

    return { subtotal, tax, total: subtotal + tax, lineData }
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
