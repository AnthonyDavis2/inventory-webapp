import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Executive Dashboard ───────────────────────────────────────────────────

  async getExecutiveDashboard(orgId: string, from: Date, to: Date) {
    const [
      revenue,
      openOrders,
      overdueInvoices,
      inventoryValue,
      topProducts,
      topCustomers,
    ] = await Promise.all([
      this.getRevenueSummary(orgId, from, to),
      this.prisma.salesOrder.count({ where: { org_id: orgId, status: { in: ['CONFIRMED', 'PARTIALLY_FULFILLED'] } } }),
      this.prisma.invoice.count({ where: { org_id: orgId, status: 'OVERDUE', deleted_at: null } }),
      this.getTotalInventoryValue(orgId),
      this.getTopProductsByRevenue(orgId, from, to),
      this.getTopCustomersByRevenue(orgId, from, to),
    ])

    return { revenue, open_orders: openOrders, overdue_invoices: overdueInvoices, inventory_value: inventoryValue, top_products: topProducts, top_customers: topCustomers }
  }

  // ─── Inventory Dashboard ───────────────────────────────────────────────────

  async getInventoryDashboard(orgId: string) {
    const [totalValue, reorderAlerts, expiringLots, lowMovers] = await Promise.all([
      this.getTotalInventoryValue(orgId),
      this.getReorderAlerts(orgId),
      this.getExpiringLots(orgId, 30),
      this.getSlowMovers(orgId),
    ])

    return { total_value: totalValue, reorder_alerts: reorderAlerts, expiring_lots: expiringLots, slow_movers: lowMovers }
  }

  async getInventoryValuationReport(orgId: string) {
    const wacs = await this.prisma.weightedAverageCost.findMany({
      where: { org_id: orgId },
      include: { product: { select: { id: true, sku: true, name: true, type: true } }, warehouse: { select: { id: true, name: true } } },
    })

    return wacs.map((w) => ({
      product: w.product,
      warehouse: w.warehouse,
      quantity_on_hand: w.quantity_on_hand,
      unit_cost_cents: w.average_cost_cents,
      total_value_cents: w.average_cost_cents * BigInt(Math.round(Number(w.quantity_on_hand))),
    }))
  }

  async getInventoryMovementReport(orgId: string, from: Date, to: Date) {
    return this.prisma.inventoryLedgerEntry.findMany({
      where: { org_id: orgId, created_at: { gte: from, lte: to } },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  }

  // ─── Sales Dashboard ───────────────────────────────────────────────────────

  async getSalesDashboard(orgId: string, from: Date, to: Date) {
    const [revenue, orderCount, avgOrderValue, topProducts, topCustomers, quoteConversion] = await Promise.all([
      this.getRevenueSummary(orgId, from, to),
      this.prisma.salesOrder.count({ where: { org_id: orgId, status: { not: 'CANCELLED' }, created_at: { gte: from, lte: to } } }),
      this.getAvgOrderValue(orgId, from, to),
      this.getTopProductsByRevenue(orgId, from, to),
      this.getTopCustomersByRevenue(orgId, from, to),
      this.getQuoteConversionRate(orgId, from, to),
    ])

    return { revenue, order_count: orderCount, avg_order_value: avgOrderValue, top_products: topProducts, top_customers: topCustomers, quote_conversion_pct: quoteConversion }
  }

  async getCustomerProfitabilityReport(orgId: string, from: Date, to: Date) {
    const invoiceLines = await this.prisma.invoiceLine.findMany({
      where: { invoice: { org_id: orgId, deleted_at: null, status: { in: ['PAID', 'PARTIALLY_PAID', 'SENT'] }, created_at: { gte: from, lte: to } } },
      include: { invoice: { include: { customer: { select: { id: true, name: true } } } } },
    })

    const byCustomer = new Map<string, { customer: any; revenue: bigint; cogs: bigint }>()
    for (const line of invoiceLines) {
      const customerId = line.invoice.customer.id
      const existing = byCustomer.get(customerId) ?? { customer: line.invoice.customer, revenue: BigInt(0), cogs: BigInt(0) }
      existing.revenue += line.total_cents
      existing.cogs += line.unit_cost_cents * BigInt(Math.round(Number(line.quantity)))
      byCustomer.set(customerId, existing)
    }

    return Array.from(byCustomer.values()).map((row) => ({
      customer: row.customer,
      revenue_cents: row.revenue,
      cogs_cents: row.cogs,
      gross_profit_cents: row.revenue - row.cogs,
      margin_pct: Number(row.revenue) > 0 ? (Number(row.revenue - row.cogs) / Number(row.revenue)) * 100 : 0,
    })).sort((a, b) => Number(b.gross_profit_cents - a.gross_profit_cents))
  }

  // ─── Purchasing Dashboard ──────────────────────────────────────────────────

  async getPurchasingDashboard(orgId: string) {
    const [openPOs, overduePOs, topVendors] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { org_id: orgId, status: { in: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'] } } }),
      this.prisma.purchaseOrder.count({
        where: {
          org_id: orgId,
          status: { in: ['APPROVED', 'SENT'] },
          expected_date: { lt: new Date() },
        },
      }),
      this.getTopVendorsBySpend(orgId),
    ])

    return { open_pos: openPOs, overdue_pos: overduePOs, top_vendors: topVendors }
  }

  // ─── Manufacturing Dashboard ───────────────────────────────────────────────

  async getManufacturingDashboard(orgId: string, from: Date, to: Date) {
    const wos = await this.prisma.workOrder.findMany({
      where: { org_id: orgId, created_at: { gte: from, lte: to } },
      include: { product: { select: { id: true, sku: true, name: true } } },
    })

    const totalProduced = wos.reduce((sum, wo) => sum + Number(wo.quantity_produced), 0)
    const totalScrapped = wos.reduce((sum, wo) => sum + Number(wo.quantity_scrapped), 0)
    const yieldRate = totalProduced + totalScrapped > 0 ? totalProduced / (totalProduced + totalScrapped) * 100 : 0

    return {
      total_work_orders: wos.length,
      total_produced: totalProduced,
      total_scrapped: totalScrapped,
      yield_rate_pct: yieldRate,
      completed: wos.filter((w) => w.status === 'COMPLETED').length,
      in_progress: wos.filter((w) => w.status === 'IN_PROGRESS').length,
    }
  }

  // ─── CSV Report Exports ────────────────────────────────────────────────────

  async exportInventoryValuationCsv(orgId: string): Promise<string> {
    const data = await this.getInventoryValuationReport(orgId)
    const rows = ['SKU,Product Name,Warehouse,Qty On Hand,Unit Cost,Total Value']
    for (const row of data) {
      rows.push([
        row.product.sku,
        `"${row.product.name}"`,
        `"${row.warehouse.name}"`,
        Number(row.quantity_on_hand).toFixed(4),
        (Number(row.unit_cost_cents) / 100).toFixed(2),
        (Number(row.total_value_cents) / 100).toFixed(2),
      ].join(','))
    }
    return rows.join('\n')
  }

  async exportAgedReceivablesCsv(orgId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { org_id: orgId, deleted_at: null, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
      include: { customer: { select: { name: true } } },
      orderBy: { due_date: 'asc' },
    })

    const now = new Date()
    const rows = ['Invoice Number,Customer,Due Date,Total,Amount Due,Days Overdue']
    for (const inv of invoices) {
      const daysOverdue = inv.due_date ? Math.max(0, Math.floor((now.getTime() - inv.due_date.getTime()) / (1000 * 60 * 60 * 24))) : 0
      rows.push([
        inv.invoice_number,
        `"${inv.customer.name}"`,
        inv.due_date?.toISOString().split('T')[0] ?? '',
        (Number(inv.total_cents) / 100).toFixed(2),
        (Number(inv.amount_due_cents) / 100).toFixed(2),
        daysOverdue,
      ].join(','))
    }
    return rows.join('\n')
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getRevenueSummary(orgId: string, from: Date, to: Date) {
    const result = await this.prisma.invoice.aggregate({
      where: { org_id: orgId, deleted_at: null, status: { in: ['PAID', 'PARTIALLY_PAID', 'SENT'] }, created_at: { gte: from, lte: to } },
      _sum: { total_cents: true, amount_paid_cents: true },
    })
    return { total_cents: result._sum.total_cents ?? BigInt(0), paid_cents: result._sum.amount_paid_cents ?? BigInt(0) }
  }

  private async getTotalInventoryValue(orgId: string) {
    const wacs = await this.prisma.weightedAverageCost.findMany({ where: { org_id: orgId } })
    return wacs.reduce((sum, w) => sum + w.average_cost_cents * BigInt(Math.round(Math.max(0, Number(w.quantity_on_hand)))), BigInt(0))
  }

  private async getTopProductsByRevenue(orgId: string, from: Date, to: Date, limit = 5) {
    const lines = await this.prisma.invoiceLine.groupBy({
      by: ['product_id'],
      where: { invoice: { org_id: orgId, deleted_at: null, created_at: { gte: from, lte: to } }, product_id: { not: null } },
      _sum: { total_cents: true },
      orderBy: { _sum: { total_cents: 'desc' } },
      take: limit,
    })

    return Promise.all(lines.map(async (l) => {
      const product = l.product_id ? await this.prisma.product.findUnique({ where: { id: l.product_id }, select: { sku: true, name: true } }) : null
      return { product, revenue_cents: l._sum.total_cents }
    }))
  }

  private async getTopCustomersByRevenue(orgId: string, from: Date, to: Date, limit = 5) {
    const result = await this.prisma.invoice.groupBy({
      by: ['customer_id'],
      where: { org_id: orgId, deleted_at: null, created_at: { gte: from, lte: to } },
      _sum: { total_cents: true },
      orderBy: { _sum: { total_cents: 'desc' } },
      take: limit,
    })

    return Promise.all(result.map(async (r) => {
      const customer = await this.prisma.customer.findUnique({ where: { id: r.customer_id }, select: { name: true } })
      return { customer, revenue_cents: r._sum.total_cents }
    }))
  }

  private async getAvgOrderValue(orgId: string, from: Date, to: Date) {
    const result = await this.prisma.salesOrder.aggregate({
      where: { org_id: orgId, status: { not: 'CANCELLED' }, created_at: { gte: from, lte: to } },
      _avg: { total_cents: true },
    })
    return result._avg.total_cents ?? 0
  }

  private async getQuoteConversionRate(orgId: string, from: Date, to: Date) {
    const [total, converted] = await Promise.all([
      this.prisma.quote.count({ where: { org_id: orgId, deleted_at: null, created_at: { gte: from, lte: to } } }),
      this.prisma.quote.count({ where: { org_id: orgId, deleted_at: null, status: 'CONVERTED', created_at: { gte: from, lte: to } } }),
    ])
    return total > 0 ? (converted / total) * 100 : 0
  }

  private async getTopVendorsBySpend(orgId: string, limit = 5) {
    const result = await this.prisma.purchaseOrder.groupBy({
      by: ['vendor_id'],
      where: { org_id: orgId, deleted_at: null, status: { notIn: ['DRAFT', 'CANCELLED'] } },
      _sum: { total_cents: true },
      orderBy: { _sum: { total_cents: 'desc' } },
      take: limit,
    })

    return Promise.all(result.map(async (r) => {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: r.vendor_id }, select: { name: true } })
      return { vendor, spend_cents: r._sum.total_cents }
    }))
  }

  private async getReorderAlerts(orgId: string) {
    const rules = await this.prisma.reorderRule.findMany({
      where: { org_id: orgId },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    })

    const alerts = []
    for (const rule of rules) {
      const stockResult = await this.prisma.inventoryLedgerEntry.groupBy({
        by: ['product_id', 'warehouse_id'],
        where: { org_id: orgId, product_id: rule.product_id, warehouse_id: rule.warehouse_id },
        _sum: { quantity: true },
      })
      const qtyOnHand = Number(stockResult[0]?._sum.quantity ?? 0)
      if (qtyOnHand <= Number(rule.reorder_point)) {
        alerts.push({ product: rule.product, warehouse: rule.warehouse, qty_on_hand: qtyOnHand, reorder_point: rule.reorder_point, reorder_quantity: rule.reorder_quantity })
      }
    }
    return alerts
  }

  private async getExpiringLots(orgId: string, days: number) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)

    return this.prisma.lot.findMany({
      where: { org_id: orgId, deleted_at: null, expires_at: { lte: cutoff, gte: new Date() } },
      include: { product: { select: { id: true, sku: true, name: true } } },
      orderBy: { expires_at: 'asc' },
    })
  }

  private async getSlowMovers(orgId: string) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const products = await this.prisma.product.findMany({
      where: { org_id: orgId, deleted_at: null },
      select: { id: true, sku: true, name: true },
    })

    const slowMovers = []
    for (const product of products) {
      const movement = await this.prisma.inventoryLedgerEntry.count({
        where: { org_id: orgId, product_id: product.id, created_at: { gte: thirtyDaysAgo } },
      })
      if (movement === 0) slowMovers.push(product)
    }
    return slowMovers.slice(0, 20)
  }
}
