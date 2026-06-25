import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreatePriceListDto } from './dto/create-price-list.dto'
import type { UpsertPriceEntryDto } from './dto/upsert-price-entry.dto'

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Price Lists ──────────────────────────────────────────────────────────

  async listPriceLists(orgId: string) {
    return this.prisma.priceList.findMany({
      where: { org_id: orgId, deleted_at: null },
      include: {
        _count: { select: { entries: true, customers: { where: { deleted_at: null } } } },
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    })
  }

  async getPriceList(orgId: string, id: string) {
    const pl = await this.prisma.priceList.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        entries: {
          include: { product: { select: { id: true, sku: true, name: true } } },
          orderBy: { created_at: 'asc' },
        },
      },
    })
    if (!pl) throw new NotFoundException('Price list not found')
    return pl
  }

  async createPriceList(orgId: string, dto: CreatePriceListDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.priceList.updateMany({ where: { org_id: orgId, deleted_at: null }, data: { is_default: false } })
      }
      return tx.priceList.create({
        data: {
          org_id: orgId,
          name: dto.name,
          description: dto.description,
          is_default: dto.is_default ?? false,
          min_margin_pct: dto.min_margin_pct,
        },
      })
    })
  }

  async updatePriceList(orgId: string, id: string, dto: Partial<CreatePriceListDto>) {
    await this.assertAccess(orgId, id)

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.priceList.updateMany({ where: { org_id: orgId, deleted_at: null, NOT: { id } }, data: { is_default: false } })
      }
      return tx.priceList.update({ where: { id }, data: dto })
    })
  }

  async deletePriceList(orgId: string, id: string) {
    const pl = await this.assertAccess(orgId, id)
    if (pl.is_default) throw new ConflictException('Cannot delete the default price list')

    const hasCustomers = await this.prisma.customer.findFirst({ where: { price_list_id: id, deleted_at: null } })
    if (hasCustomers) throw new ConflictException('Cannot delete a price list assigned to customers')

    await this.prisma.priceList.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  // ─── Entries ──────────────────────────────────────────────────────────────

  async upsertEntry(orgId: string, priceListId: string, dto: UpsertPriceEntryDto) {
    await this.assertAccess(orgId, priceListId)

    const product = await this.prisma.product.findFirst({ where: { id: dto.product_id, org_id: orgId, deleted_at: null } })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.priceListEntry.upsert({
      where: { price_list_id_product_id: { price_list_id: priceListId, product_id: dto.product_id } },
      create: {
        org_id: orgId,
        price_list_id: priceListId,
        product_id: dto.product_id,
        rule_type: dto.rule_type,
        flat_price_cents: dto.flat_price_cents !== undefined ? BigInt(Math.round(dto.flat_price_cents)) : null,
        markup_factor: dto.markup_factor,
        discount_pct: dto.discount_pct,
      },
      update: {
        rule_type: dto.rule_type,
        flat_price_cents: dto.flat_price_cents !== undefined ? BigInt(Math.round(dto.flat_price_cents)) : null,
        markup_factor: dto.markup_factor,
        discount_pct: dto.discount_pct,
      },
    })
  }

  async deleteEntry(orgId: string, priceListId: string, entryId: string) {
    await this.assertAccess(orgId, priceListId)
    const entry = await this.prisma.priceListEntry.findFirst({ where: { id: entryId, price_list_id: priceListId } })
    if (!entry) throw new NotFoundException('Price list entry not found')
    await this.prisma.priceListEntry.delete({ where: { id: entryId } })
  }

  // ─── Price Resolution ─────────────────────────────────────────────────────

  /** Resolve the unit price (cents) for a product given a customer or price list. */
  async resolvePrice(orgId: string, productId: string, customerId?: string, priceListId?: string): Promise<bigint | null> {
    let resolvedPriceListId = priceListId

    if (!resolvedPriceListId && customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, org_id: orgId, deleted_at: null },
        select: { price_list_id: true },
      })
      resolvedPriceListId = customer?.price_list_id ?? undefined
    }

    if (!resolvedPriceListId) {
      const defaultList = await this.prisma.priceList.findFirst({
        where: { org_id: orgId, is_default: true, deleted_at: null },
        select: { id: true },
      })
      resolvedPriceListId = defaultList?.id
    }

    if (!resolvedPriceListId) return null

    const entry = await this.prisma.priceListEntry.findFirst({
      where: { price_list_id: resolvedPriceListId, product_id: productId },
    })

    if (!entry) return null

    if (entry.rule_type === 'FLAT' && entry.flat_price_cents !== null) {
      return entry.flat_price_cents
    }

    if (entry.rule_type === 'MARKUP_OVER_COST' && entry.markup_factor !== null) {
      const wac = await this.prisma.weightedAverageCost.findFirst({
        where: { org_id: orgId, product_id: productId },
        orderBy: { updated_at: 'desc' },
      })
      if (!wac) return null
      return BigInt(Math.round(Number(wac.average_cost_cents) * Number(entry.markup_factor)))
    }

    return null
  }

  private async assertAccess(orgId: string, id: string) {
    const pl = await this.prisma.priceList.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!pl) throw new NotFoundException('Price list not found')
    return pl
  }
}
