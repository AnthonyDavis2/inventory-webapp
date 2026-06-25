import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreateVendorDto } from './dto/create-vendor.dto'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { UpsertPriceEntryDto } from './dto/upsert-price-entry.dto'

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, q?: string) {
    return this.prisma.vendor.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { purchase_orders: true, contacts: { where: { deleted_at: null } } } } },
      orderBy: { name: 'asc' },
    })
  }

  async getOne(orgId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        contacts: { where: { deleted_at: null }, orderBy: [{ is_primary: 'desc' }, { name: 'asc' }] },
        price_list: {
          include: { product: { select: { id: true, sku: true, name: true } } },
          orderBy: { effective_from: 'desc' },
        },
      },
    })
    if (!vendor) throw new NotFoundException('Vendor not found')
    return vendor
  }

  async create(orgId: string, userId: string, dto: CreateVendorDto) {
    if (dto.code) {
      const conflict = await this.prisma.vendor.findFirst({
        where: { org_id: orgId, code: dto.code, deleted_at: null },
      })
      if (conflict) throw new ConflictException(`Vendor code "${dto.code}" already exists`)
    }

    return this.prisma.vendor.create({
      data: {
        org_id: orgId,
        name: dto.name,
        code: dto.code,
        email: dto.email,
        phone: dto.phone,
        address_line1: dto.address_line1,
        address_line2: dto.address_line2,
        city: dto.city,
        state: dto.state,
        zip: dto.zip,
        tax_id: dto.tax_id,
        payment_terms: dto.payment_terms ?? 'NET30',
        lead_time_days: dto.lead_time_days ?? 7,
        notes: dto.notes,
        created_by: userId,
        updated_by: userId,
      },
    })
  }

  async update(orgId: string, userId: string, id: string, dto: Partial<CreateVendorDto>) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!vendor) throw new NotFoundException('Vendor not found')

    return this.prisma.vendor.update({
      where: { id },
      data: { ...dto, updated_by: userId },
    })
  }

  async delete(orgId: string, userId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!vendor) throw new NotFoundException('Vendor not found')

    const hasActivePOs = await this.prisma.purchaseOrder.findFirst({
      where: { org_id: orgId, vendor_id: id, status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'] } },
    })
    if (hasActivePOs) throw new BadRequestException('Cannot delete a vendor with open purchase orders')

    await this.prisma.vendor.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: userId } })
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  async createContact(orgId: string, vendorId: string, dto: CreateContactDto) {
    await this.assertVendorAccess(orgId, vendorId)

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_primary) {
        await tx.vendorContact.updateMany({ where: { vendor_id: vendorId }, data: { is_primary: false } })
      }
      return tx.vendorContact.create({
        data: { vendor_id: vendorId, name: dto.name, role: dto.role, email: dto.email, phone: dto.phone, is_primary: dto.is_primary ?? false },
      })
    })
  }

  async deleteContact(orgId: string, vendorId: string, contactId: string) {
    await this.assertVendorAccess(orgId, vendorId)
    const contact = await this.prisma.vendorContact.findFirst({ where: { id: contactId, vendor_id: vendorId, deleted_at: null } })
    if (!contact) throw new NotFoundException('Contact not found')
    await this.prisma.vendorContact.update({ where: { id: contactId }, data: { deleted_at: new Date() } })
  }

  // ─── Price List ───────────────────────────────────────────────────────────

  async upsertPriceEntry(orgId: string, vendorId: string, dto: UpsertPriceEntryDto) {
    await this.assertVendorAccess(orgId, vendorId)

    const product = await this.prisma.product.findFirst({ where: { id: dto.product_id, org_id: orgId, deleted_at: null } })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.vendorPriceListEntry.create({
      data: {
        org_id: orgId,
        vendor_id: vendorId,
        product_id: dto.product_id,
        unit_cost_cents: BigInt(Math.round(dto.unit_cost_cents)),
        uom_id: dto.uom_id,
        min_quantity: dto.min_quantity ?? 1,
        effective_from: new Date(dto.effective_from),
        effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
      },
    })
  }

  async deletePriceEntry(orgId: string, vendorId: string, entryId: string) {
    await this.assertVendorAccess(orgId, vendorId)
    const entry = await this.prisma.vendorPriceListEntry.findFirst({ where: { id: entryId, vendor_id: vendorId } })
    if (!entry) throw new NotFoundException('Price list entry not found')
    await this.prisma.vendorPriceListEntry.delete({ where: { id: entryId } })
  }

  /** Return the current best price for a product from a vendor on a given date */
  async getCurrentPrice(orgId: string, vendorId: string, productId: string, quantity = 1, asOf = new Date()) {
    return this.prisma.vendorPriceListEntry.findFirst({
      where: {
        org_id: orgId,
        vendor_id: vendorId,
        product_id: productId,
        min_quantity: { lte: quantity },
        effective_from: { lte: asOf },
        OR: [{ effective_to: null }, { effective_to: { gte: asOf } }],
      },
      orderBy: [{ min_quantity: 'desc' }, { effective_from: 'desc' }],
    })
  }

  private async assertVendorAccess(orgId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: vendorId, org_id: orgId, deleted_at: null } })
    if (!vendor) throw new NotFoundException('Vendor not found')
    return vendor
  }
}
