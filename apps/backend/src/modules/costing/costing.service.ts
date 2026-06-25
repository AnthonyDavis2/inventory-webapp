import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'

@Injectable()
export class CostingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get or set the org-level overhead allocation rule. */
  async getOverheadRule(orgId: string) {
    return this.prisma.overheadAllocationRule.findUnique({ where: { org_id: orgId } })
  }

  async upsertOverheadRule(orgId: string, method: string, pctOfMaterial?: number, perUnitCents?: number, perHourCents?: number) {
    return this.prisma.overheadAllocationRule.upsert({
      where: { org_id: orgId },
      create: {
        org_id: orgId,
        method: method as any,
        pct_of_material: pctOfMaterial,
        per_unit_cents: perUnitCents ? BigInt(Math.round(perUnitCents)) : null,
        per_hour_cents: perHourCents ? BigInt(Math.round(perHourCents)) : null,
      },
      update: {
        method: method as any,
        pct_of_material: pctOfMaterial,
        per_unit_cents: perUnitCents ? BigInt(Math.round(perUnitCents)) : null,
        per_hour_cents: perHourCents ? BigInt(Math.round(perHourCents)) : null,
      },
    })
  }

  /** Calculate and persist a standard cost record for a product (optionally from a BOM version). */
  async calcStandardCost(orgId: string, productId: string, bomVersionId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, org_id: orgId, deleted_at: null } })
    if (!product) throw new NotFoundException('Product not found')

    let materialCost = BigInt(0)
    let laborCost = BigInt(0)

    if (bomVersionId) {
      const lines = await this.prisma.bOMLine.findMany({
        where: { bom_version_id: bomVersionId },
        include: { component: true },
      })

      for (const line of lines) {
        const wac = await this.prisma.weightedAverageCost.findFirst({
          where: { org_id: orgId, product_id: line.component_id },
          orderBy: { updated_at: 'desc' },
        })
        const unitCost = wac?.average_cost_cents ?? BigInt(0)
        const lineQtyWithScrap = Number(line.quantity) * (1 + Number(line.scrap_pct) / 100)
        materialCost += unitCost * BigInt(Math.round(lineQtyWithScrap * 1000)) / BigInt(1000)
      }

      // Labor: aggregate from completed WOs for this BOM version
      const laborAgg = await this.prisma.workOrderLaborEntry.aggregate({
        where: { wo: { org_id: orgId, bom_version_id: bomVersionId, status: 'COMPLETED' } },
        _sum: { total_cents: true },
        _count: { _all: true },
      })
      laborCost = BigInt(laborAgg._sum.total_cents ?? 0)
    }

    const overheadRule = await this.prisma.overheadAllocationRule.findUnique({ where: { org_id: orgId } })
    let overheadCost = BigInt(0)
    if (overheadRule) {
      if (overheadRule.method === 'PCT_OF_MATERIAL' && overheadRule.pct_of_material) {
        overheadCost = BigInt(Math.round(Number(materialCost) * Number(overheadRule.pct_of_material) / 100))
      } else if (overheadRule.method === 'PER_UNIT' && overheadRule.per_unit_cents) {
        overheadCost = overheadRule.per_unit_cents
      } else if (overheadRule.method === 'PER_LABOR_HOUR' && overheadRule.per_hour_cents) {
        overheadCost = overheadRule.per_hour_cents
      }
    }

    const totalCost = materialCost + laborCost + overheadCost

    // Close out any existing effective standard cost
    await this.prisma.productStandardCost.updateMany({
      where: { org_id: orgId, product_id: productId, effective_to: null },
      data: { effective_to: new Date() },
    })

    return this.prisma.productStandardCost.create({
      data: {
        org_id: orgId,
        product_id: productId,
        bom_version_id: bomVersionId,
        material_cost_cents: materialCost,
        labor_cost_cents: laborCost,
        overhead_cost_cents: overheadCost,
        total_cost_cents: totalCost,
        effective_from: new Date(),
      },
    })
  }

  async getProductCostHistory(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, org_id: orgId } })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.productStandardCost.findMany({
      where: { org_id: orgId, product_id: productId },
      include: { bom_version: { select: { version_number: true } } },
      orderBy: { effective_from: 'desc' },
    })
  }

  /** Margin analysis: standard cost vs selling price per product. */
  async getMarginAnalysis(orgId: string) {
    const costs = await this.prisma.productStandardCost.findMany({
      where: { org_id: orgId, effective_to: null },
      include: { product: { select: { id: true, sku: true, name: true } } },
    })

    const results = await Promise.all(
      costs.map(async (c) => {
        const defaultList = await this.prisma.priceList.findFirst({ where: { org_id: orgId, is_default: true, deleted_at: null } })
        let sellingPrice: bigint | null = null
        if (defaultList) {
          const entry = await this.prisma.priceListEntry.findFirst({
            where: { price_list_id: defaultList.id, product_id: c.product_id, rule_type: 'FLAT' },
          })
          sellingPrice = entry?.flat_price_cents ?? null
        }

        const marginCents = sellingPrice ? sellingPrice - c.total_cost_cents : null
        const marginPct = sellingPrice && sellingPrice > BigInt(0)
          ? (Number(marginCents) / Number(sellingPrice)) * 100
          : null

        return {
          product: c.product,
          standard_cost_cents: c.total_cost_cents,
          selling_price_cents: sellingPrice,
          margin_cents: marginCents,
          margin_pct: marginPct,
        }
      }),
    )

    return results
  }

  /** Work order cost variance: actual vs planned cost. */
  async getWOCostVariance(orgId: string) {
    const wos = await this.prisma.workOrder.findMany({
      where: { org_id: orgId, status: { in: ['COMPLETED', 'CLOSED'] } },
      include: { product: { select: { id: true, sku: true, name: true } } },
      orderBy: { actual_end: 'desc' },
      take: 100,
    })

    return wos.map((wo) => ({
      wo_number: wo.wo_number,
      product: wo.product,
      quantity_produced: wo.quantity_produced,
      planned_cost_cents: wo.planned_cost_cents,
      actual_cost_cents: wo.actual_cost_cents,
      variance_cents: wo.actual_cost_cents - wo.planned_cost_cents,
      variance_pct: Number(wo.planned_cost_cents) > 0
        ? (Number(wo.actual_cost_cents - wo.planned_cost_cents) / Number(wo.planned_cost_cents)) * 100
        : null,
    }))
  }
}
