import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreateCustomerDto } from './dto/create-customer.dto'
import type { CreateContactDto } from './dto/create-contact.dto'
import type { CreateAddressDto } from './dto/create-address.dto'
import type { CreateGroupDto } from './dto/create-group.dto'

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  async listGroups(orgId: string) {
    return this.prisma.customerGroup.findMany({
      where: { org_id: orgId, deleted_at: null },
      include: { _count: { select: { customers: { where: { deleted_at: null } } } } },
      orderBy: { name: 'asc' },
    })
  }

  async createGroup(orgId: string, dto: CreateGroupDto) {
    return this.prisma.customerGroup.create({
      data: { org_id: orgId, name: dto.name, description: dto.description },
    })
  }

  async updateGroup(orgId: string, id: string, dto: Partial<CreateGroupDto>) {
    await this.assertGroupAccess(orgId, id)
    return this.prisma.customerGroup.update({ where: { id }, data: dto })
  }

  async deleteGroup(orgId: string, id: string) {
    await this.assertGroupAccess(orgId, id)
    const hasCustomers = await this.prisma.customer.findFirst({ where: { group_id: id, deleted_at: null } })
    if (hasCustomers) throw new BadRequestException('Cannot delete a group that has customers assigned to it')
    await this.prisma.customerGroup.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  async list(orgId: string, q?: string, groupId?: string, type?: string) {
    return this.prisma.customer.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(groupId && { group_id: groupId }),
        ...(type && { type: type as any }),
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        group: { select: { id: true, name: true } },
        price_list: { select: { id: true, name: true } },
        _count: { select: { sales_orders: { where: { deleted_at: null } }, invoices: { where: { deleted_at: null } } } },
      },
      orderBy: { name: 'asc' },
    })
  }

  async getOne(orgId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        group: { select: { id: true, name: true } },
        price_list: { select: { id: true, name: true } },
        contacts: { where: { deleted_at: null }, orderBy: [{ is_primary: 'desc' }, { name: 'asc' }] },
        addresses: { where: { deleted_at: null }, orderBy: { created_at: 'asc' } },
      },
    })
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  async create(orgId: string, userId: string, dto: CreateCustomerDto) {
    if (dto.code) {
      const conflict = await this.prisma.customer.findFirst({ where: { org_id: orgId, code: dto.code, deleted_at: null } })
      if (conflict) throw new ConflictException(`Customer code "${dto.code}" already exists`)
    }

    if (dto.group_id) {
      await this.assertGroupAccess(orgId, dto.group_id)
    }

    return this.prisma.customer.create({
      data: {
        org_id: orgId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        group_id: dto.group_id,
        price_list_id: dto.price_list_id,
        payment_terms: dto.payment_terms ?? 'NET30',
        credit_limit_cents: dto.credit_limit_cents ? BigInt(dto.credit_limit_cents) : BigInt(0),
        tax_exempt: dto.tax_exempt ?? false,
        tax_exempt_number: dto.tax_exempt_number,
        tax_exempt_expires: dto.tax_exempt_expires ? new Date(dto.tax_exempt_expires) : null,
        notes: dto.notes,
        created_by: userId,
        updated_by: userId,
      },
    })
  }

  async update(orgId: string, userId: string, id: string, dto: Partial<CreateCustomerDto>) {
    await this.assertCustomerAccess(orgId, id)

    if (dto.code) {
      const conflict = await this.prisma.customer.findFirst({ where: { org_id: orgId, code: dto.code, deleted_at: null, NOT: { id } } })
      if (conflict) throw new ConflictException(`Customer code "${dto.code}" already exists`)
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        credit_limit_cents: dto.credit_limit_cents !== undefined ? BigInt(dto.credit_limit_cents) : undefined,
        tax_exempt_expires: dto.tax_exempt_expires ? new Date(dto.tax_exempt_expires) : undefined,
        updated_by: userId,
      },
    })
  }

  async delete(orgId: string, userId: string, id: string) {
    await this.assertCustomerAccess(orgId, id)

    const hasActiveOrders = await this.prisma.salesOrder.findFirst({
      where: { org_id: orgId, customer_id: id, status: { in: ['DRAFT', 'CONFIRMED', 'PARTIALLY_FULFILLED'] } },
    })
    if (hasActiveOrders) throw new BadRequestException('Cannot delete a customer with open sales orders')

    await this.prisma.customer.update({ where: { id }, data: { deleted_at: new Date(), deleted_by: userId } })
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  async createContact(orgId: string, customerId: string, dto: CreateContactDto) {
    await this.assertCustomerAccess(orgId, customerId)

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_primary) {
        await tx.customerContact.updateMany({ where: { customer_id: customerId }, data: { is_primary: false } })
      }
      return tx.customerContact.create({
        data: { customer_id: customerId, name: dto.name, role: dto.role, email: dto.email, phone: dto.phone, is_primary: dto.is_primary ?? false },
      })
    })
  }

  async deleteContact(orgId: string, customerId: string, contactId: string) {
    await this.assertCustomerAccess(orgId, customerId)
    const contact = await this.prisma.customerContact.findFirst({ where: { id: contactId, customer_id: customerId, deleted_at: null } })
    if (!contact) throw new NotFoundException('Contact not found')
    await this.prisma.customerContact.update({ where: { id: contactId }, data: { deleted_at: new Date() } })
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  async createAddress(orgId: string, customerId: string, dto: CreateAddressDto) {
    await this.assertCustomerAccess(orgId, customerId)

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.customerAddress.updateMany({
          where: { customer_id: customerId, type: dto.type },
          data: { is_default: false },
        })
      }
      return tx.customerAddress.create({
        data: {
          customer_id: customerId,
          type: dto.type,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          is_default: dto.is_default ?? false,
        },
      })
    })
  }

  async deleteAddress(orgId: string, customerId: string, addressId: string) {
    await this.assertCustomerAccess(orgId, customerId)
    const address = await this.prisma.customerAddress.findFirst({ where: { id: addressId, customer_id: customerId, deleted_at: null } })
    if (!address) throw new NotFoundException('Address not found')
    await this.prisma.customerAddress.update({ where: { id: addressId }, data: { deleted_at: new Date() } })
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertCustomerAccess(orgId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, org_id: orgId, deleted_at: null } })
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  private async assertGroupAccess(orgId: string, groupId: string) {
    const group = await this.prisma.customerGroup.findFirst({ where: { id: groupId, org_id: orgId, deleted_at: null } })
    if (!group) throw new NotFoundException('Customer group not found')
    return group
  }
}
