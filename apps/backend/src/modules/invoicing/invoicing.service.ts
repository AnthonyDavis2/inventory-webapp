import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreateInvoiceDto } from './dto/create-invoice.dto'
import type { RecordPaymentDto } from './dto/record-payment.dto'
import type { CreateCreditMemoDto } from './dto/create-credit-memo.dto'

@Injectable()
export class InvoicingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  async listInvoices(orgId: string, status?: string, customerId?: string) {
    return this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(status && { status: status as any }),
        ...(customerId && { customer_id: customerId }),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true, payments: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async getInvoice(orgId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        customer: true,
        so: { select: { id: true, order_number: true } },
        lines: { orderBy: { sort_order: 'asc' } },
        payments: { where: { deleted_at: null }, orderBy: { paid_at: 'desc' } },
        credit_memos: { where: { deleted_at: null } },
      },
    })
    if (!invoice) throw new NotFoundException('Invoice not found')
    return invoice
  }

  async createInvoice(orgId: string, userId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customer_id, org_id: orgId, deleted_at: null } })
    if (!customer) throw new NotFoundException('Customer not found')

    const invoiceNumber = await this.nextDocumentNumber(orgId, 'INVOICE')

    let subtotal = BigInt(0)
    let tax = BigInt(0)

    const lineData = dto.lines.map((l, i) => {
      const discountFactor = 1 - (l.discount_pct ?? 0) / 100
      const lineSubtotal = BigInt(Math.round(l.quantity * l.unit_price_cents * discountFactor))
      const lineTax = BigInt(Math.round(Number(lineSubtotal) * (l.tax_pct ?? 0) / 100))
      subtotal += lineSubtotal
      tax += lineTax

      return {
        so_line_id: l.so_line_id,
        product_id: l.product_id,
        description: l.description,
        quantity: l.quantity,
        unit_price_cents: BigInt(Math.round(l.unit_price_cents)),
        discount_pct: l.discount_pct ?? 0,
        tax_pct: l.tax_pct ?? 0,
        tax_cents: lineTax,
        total_cents: lineSubtotal + lineTax,
        sort_order: l.sort_order ?? i,
      }
    })

    const total = subtotal + tax

    return this.prisma.invoice.create({
      data: {
        org_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: dto.customer_id,
        so_id: dto.so_id,
        status: 'DRAFT',
        payment_terms: dto.payment_terms ?? customer.payment_terms,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        notes: dto.notes,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        amount_due_cents: total,
        created_by: userId,
        updated_by: userId,
        lines: { create: lineData },
      },
      include: { lines: true },
    })
  }

  /** Generate an invoice directly from a fully or partially fulfilled sales order. */
  async createFromSO(orgId: string, userId: string, soId: string) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id: soId, org_id: orgId, deleted_at: null },
      include: {
        customer: true,
        lines: { include: { product: { select: { id: true, sku: true, name: true } } } },
      },
    })
    if (!so) throw new NotFoundException('Sales order not found')
    if (!['CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(so.status)) {
      throw new BadRequestException(`Cannot invoice a sales order in status ${so.status}`)
    }

    const invoiceNumber = await this.nextDocumentNumber(orgId, 'INVOICE')

    const lineData = so.lines.map((l, i) => ({
      so_line_id: l.id,
      product_id: l.product_id,
      description: l.description ?? l.product.name,
      quantity: l.quantity_ordered,
      unit_price_cents: l.unit_price_cents,
      discount_pct: l.discount_pct,
      tax_pct: l.tax_pct,
      tax_cents: l.tax_cents,
      total_cents: l.total_cents,
      sort_order: i,
    }))

    return this.prisma.invoice.create({
      data: {
        org_id: orgId,
        invoice_number: invoiceNumber,
        customer_id: so.customer_id,
        so_id: soId,
        status: 'DRAFT',
        payment_terms: so.payment_terms,
        subtotal_cents: so.subtotal_cents,
        discount_cents: so.discount_cents,
        tax_cents: so.tax_cents,
        shipping_cents: so.shipping_cents,
        total_cents: so.total_cents,
        amount_due_cents: so.total_cents,
        created_by: userId,
        updated_by: userId,
        lines: { create: lineData },
      },
      include: { lines: true },
    })
  }

  async sendInvoice(orgId: string, userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!invoice) throw new NotFoundException('Invoice not found')
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be sent')

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sent_at: new Date(), updated_by: userId },
    })
  }

  async voidInvoice(orgId: string, userId: string, id: string, reason?: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!invoice) throw new NotFoundException('Invoice not found')
    if (invoice.status === 'PAID') throw new ForbiddenException('Cannot void a fully paid invoice')
    if (invoice.status === 'VOID') throw new BadRequestException('Invoice is already voided')

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'VOID', voided_at: new Date(), voided_reason: reason, updated_by: userId },
    })
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  async recordPayment(orgId: string, userId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, org_id: orgId, deleted_at: null } })
    if (!invoice) throw new NotFoundException('Invoice not found')
    if (['VOID', 'PAID'].includes(invoice.status) && invoice.amount_due_cents <= BigInt(0)) {
      throw new BadRequestException('No balance due on this invoice')
    }

    const paymentAmount = BigInt(Math.round(dto.amount_cents))

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          org_id: orgId,
          invoice_id: invoiceId,
          amount_cents: paymentAmount,
          method: dto.method,
          reference: dto.reference,
          paid_at: new Date(dto.paid_at),
          notes: dto.notes,
          created_by: userId,
        },
      })

      const newAmountPaid = invoice.amount_paid_cents + paymentAmount
      const newAmountDue = invoice.total_cents - newAmountPaid

      let newStatus: string = invoice.status
      if (newAmountDue <= BigInt(0)) {
        newStatus = 'PAID'
      } else if (newAmountPaid > BigInt(0)) {
        newStatus = 'PARTIALLY_PAID'
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amount_paid_cents: newAmountPaid,
          amount_due_cents: newAmountDue < BigInt(0) ? BigInt(0) : newAmountDue,
          status: newStatus as any,
          paid_at: newStatus === 'PAID' ? new Date(dto.paid_at) : undefined,
          updated_by: userId,
        },
      })

      return payment
    })
  }

  // ─── Credit Memos ─────────────────────────────────────────────────────────

  async createCreditMemo(orgId: string, userId: string, dto: CreateCreditMemoDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customer_id, org_id: orgId, deleted_at: null } })
    if (!customer) throw new NotFoundException('Customer not found')

    const memoNumber = await this.nextDocumentNumber(orgId, 'CREDIT_MEMO')

    return this.prisma.creditMemo.create({
      data: {
        org_id: orgId,
        memo_number: memoNumber,
        invoice_id: dto.invoice_id,
        customer_id: dto.customer_id,
        amount_cents: BigInt(Math.round(dto.amount_cents)),
        reason: dto.reason,
        created_by: userId,
      },
    })
  }

  async listCreditMemos(orgId: string, customerId?: string) {
    return this.prisma.creditMemo.findMany({
      where: { org_id: orgId, deleted_at: null, ...(customerId && { customer_id: customerId }) },
      orderBy: { created_at: 'desc' },
    })
  }

  // ─── Aged Receivables ─────────────────────────────────────────────────────

  async getAgedReceivables(orgId: string) {
    const now = new Date()
    const invoices = await this.prisma.invoice.findMany({
      where: { org_id: orgId, deleted_at: null, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      include: { customer: { select: { id: true, name: true } } },
    })

    return invoices.map((inv) => {
      const dueDays = inv.due_date ? Math.floor((now.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24)) : 0
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer: inv.customer,
        due_date: inv.due_date,
        total_cents: inv.total_cents,
        amount_due_cents: inv.amount_due_cents,
        days_overdue: dueDays > 0 ? dueDays : 0,
        bucket: dueDays <= 0 ? 'current' : dueDays <= 30 ? '1-30' : dueDays <= 60 ? '31-60' : dueDays <= 90 ? '61-90' : '90+',
      }
    })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
