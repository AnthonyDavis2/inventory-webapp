import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreateWarehouseDto } from './dto/create-warehouse.dto'
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto'
import type { CreateBinDto } from './dto/create-bin.dto'

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    return this.prisma.warehouse.findMany({
      where: { org_id: orgId, deleted_at: null },
      include: {
        _count: { select: { bin_locations: { where: { deleted_at: null } } } },
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    })
  }

  async getOne(orgId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        bin_locations: {
          where: { deleted_at: null },
          orderBy: { code: 'asc' },
        },
      },
    })
    if (!warehouse) throw new NotFoundException('Warehouse not found')
    return warehouse
  }

  async create(orgId: string, userId: string, dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { org_id: orgId, code: dto.code, deleted_at: null },
    })
    if (existing) throw new ConflictException(`Warehouse code "${dto.code}" already exists`)

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default) {
        await tx.warehouse.updateMany({
          where: { org_id: orgId, deleted_at: null },
          data: { is_default: false },
        })
      }

      const hasAny = await tx.warehouse.findFirst({ where: { org_id: orgId, deleted_at: null } })

      return tx.warehouse.create({
        data: {
          org_id: orgId,
          name: dto.name,
          code: dto.code,
          bins_enabled: dto.bins_enabled ?? false,
          // First warehouse created is always default
          is_default: dto.is_default ?? !hasAny,
          address_line1: dto.address_line1,
          address_line2: dto.address_line2,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          created_by: userId,
          updated_by: userId,
        },
      })
    })
  }

  async update(orgId: string, userId: string, id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!warehouse) throw new NotFoundException('Warehouse not found')

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_default === true && !warehouse.is_default) {
        await tx.warehouse.updateMany({
          where: { org_id: orgId, deleted_at: null },
          data: { is_default: false },
        })
      }

      return tx.warehouse.update({
        where: { id },
        data: {
          name: dto.name,
          bins_enabled: dto.bins_enabled,
          is_default: dto.is_default,
          address_line1: dto.address_line1,
          address_line2: dto.address_line2,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          updated_by: userId,
        },
      })
    })
  }

  async delete(orgId: string, userId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!warehouse) throw new NotFoundException('Warehouse not found')

    if (warehouse.is_default) {
      throw new ForbiddenException('Cannot delete the default warehouse. Set another warehouse as default first.')
    }

    const hasStock = await this.prisma.inventoryLedgerEntry.findFirst({
      where: { warehouse_id: id },
    })
    if (hasStock) {
      throw new BadRequestException('Cannot delete a warehouse with inventory history. Archive it by updating to inactive instead.')
    }

    await this.prisma.warehouse.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: userId },
    })
  }

  // Bin Locations

  async listBins(orgId: string, warehouseId: string) {
    await this.assertWarehouseAccess(orgId, warehouseId)
    return this.prisma.binLocation.findMany({
      where: { warehouse_id: warehouseId, deleted_at: null },
      orderBy: { code: 'asc' },
    })
  }

  async createBin(orgId: string, warehouseId: string, dto: CreateBinDto) {
    const warehouse = await this.assertWarehouseAccess(orgId, warehouseId)
    if (!warehouse.bins_enabled) {
      throw new BadRequestException('Bin locations are not enabled for this warehouse. Enable bins_enabled first.')
    }

    const existing = await this.prisma.binLocation.findFirst({
      where: { warehouse_id: warehouseId, code: dto.code, deleted_at: null },
    })
    if (existing) throw new ConflictException(`Bin code "${dto.code}" already exists in this warehouse`)

    return this.prisma.binLocation.create({
      data: {
        org_id: orgId,
        warehouse_id: warehouseId,
        code: dto.code,
        description: dto.description,
        is_active: dto.is_active ?? true,
      },
    })
  }

  async updateBin(orgId: string, warehouseId: string, binId: string, dto: Partial<CreateBinDto>) {
    await this.assertWarehouseAccess(orgId, warehouseId)

    const bin = await this.prisma.binLocation.findFirst({
      where: { id: binId, warehouse_id: warehouseId, deleted_at: null },
    })
    if (!bin) throw new NotFoundException('Bin location not found')

    if (dto.code && dto.code !== bin.code) {
      const conflict = await this.prisma.binLocation.findFirst({
        where: { warehouse_id: warehouseId, code: dto.code, deleted_at: null },
      })
      if (conflict) throw new ConflictException(`Bin code "${dto.code}" already exists in this warehouse`)
    }

    return this.prisma.binLocation.update({
      where: { id: binId },
      data: { code: dto.code, description: dto.description, is_active: dto.is_active },
    })
  }

  async deleteBin(orgId: string, warehouseId: string, binId: string) {
    await this.assertWarehouseAccess(orgId, warehouseId)

    const bin = await this.prisma.binLocation.findFirst({
      where: { id: binId, warehouse_id: warehouseId, deleted_at: null },
    })
    if (!bin) throw new NotFoundException('Bin location not found')

    const hasStock = await this.prisma.inventoryLedgerEntry.findFirst({
      where: { bin_location_id: binId },
    })
    if (hasStock) {
      throw new BadRequestException('Cannot delete a bin with inventory history. Deactivate it instead.')
    }

    await this.prisma.binLocation.update({
      where: { id: binId },
      data: { deleted_at: new Date() },
    })
  }

  private async assertWarehouseAccess(orgId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, org_id: orgId, deleted_at: null },
    })
    if (!warehouse) throw new NotFoundException('Warehouse not found')
    return warehouse
  }
}
