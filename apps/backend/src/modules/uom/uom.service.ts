import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import type { UOMType } from '@prisma/client'
import { PrismaService } from '../../core/database/prisma.service'
import type { CreateUomDto } from './dto/create-uom.dto'
import type { UpdateUomDto } from './dto/update-uom.dto'
import type { CreateConversionDto } from './dto/create-conversion.dto'

@Injectable()
export class UomService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(orgId: string) {
    const [globals, orgUoms] = await Promise.all([
      this.prisma.unitOfMeasure.findMany({
        where: { org_id: null, deleted_at: null },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.unitOfMeasure.findMany({
        where: { org_id: orgId, deleted_at: null },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
    ])
    return { global: globals, custom: orgUoms }
  }

  async getOne(orgId: string, id: string) {
    const uom = await this.prisma.unitOfMeasure.findFirst({
      where: {
        id,
        deleted_at: null,
        OR: [{ org_id: orgId }, { org_id: null }],
      },
    })
    if (!uom) throw new NotFoundException('UOM not found')
    return uom
  }

  async create(orgId: string, dto: CreateUomDto) {
    const existing = await this.prisma.unitOfMeasure.findFirst({
      where: { org_id: orgId, abbreviation: dto.abbreviation, deleted_at: null },
    })
    if (existing) throw new ConflictException(`Abbreviation "${dto.abbreviation}" already exists`)

    return this.prisma.unitOfMeasure.create({
      data: {
        org_id: orgId,
        name: dto.name,
        abbreviation: dto.abbreviation,
        type: dto.type as UOMType,
        is_global: false,
      },
    })
  }

  async update(orgId: string, id: string, dto: UpdateUomDto) {
    const uom = await this.prisma.unitOfMeasure.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!uom) throw new NotFoundException('UOM not found or is not a custom UOM')

    if (dto.abbreviation && dto.abbreviation !== uom.abbreviation) {
      const conflict = await this.prisma.unitOfMeasure.findFirst({
        where: { org_id: orgId, abbreviation: dto.abbreviation, deleted_at: null },
      })
      if (conflict) throw new ConflictException(`Abbreviation "${dto.abbreviation}" already exists`)
    }

    return this.prisma.unitOfMeasure.update({
      where: { id },
      data: { name: dto.name, abbreviation: dto.abbreviation },
    })
  }

  async delete(orgId: string, id: string) {
    const uom = await this.prisma.unitOfMeasure.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!uom) throw new NotFoundException('UOM not found or is not a custom UOM')

    const inUse = await this.prisma.product.findFirst({
      where: {
        org_id: orgId,
        deleted_at: null,
        OR: [
          { purchase_uom_id: id },
          { stocking_uom_id: id },
          { sales_uom_id: id },
        ],
      },
    })
    if (inUse) throw new BadRequestException('UOM is in use by one or more products and cannot be deleted')

    await this.prisma.unitOfMeasure.update({
      where: { id },
      data: { deleted_at: new Date() },
    })
  }

  // Conversions

  async listConversions(orgId: string) {
    return this.prisma.uOMConversion.findMany({
      where: { org_id: orgId },
      include: {
        from_uom: { select: { id: true, name: true, abbreviation: true } },
        to_uom: { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: { created_at: 'asc' },
    })
  }

  async createConversion(orgId: string, dto: CreateConversionDto) {
    if (dto.from_uom_id === dto.to_uom_id) {
      throw new BadRequestException('from_uom_id and to_uom_id must be different')
    }

    const [from, to] = await Promise.all([
      this.prisma.unitOfMeasure.findFirst({
        where: { id: dto.from_uom_id, deleted_at: null, OR: [{ org_id: orgId }, { org_id: null }] },
      }),
      this.prisma.unitOfMeasure.findFirst({
        where: { id: dto.to_uom_id, deleted_at: null, OR: [{ org_id: orgId }, { org_id: null }] },
      }),
    ])
    if (!from) throw new NotFoundException('Source UOM not found')
    if (!to) throw new NotFoundException('Target UOM not found')

    const existing = await this.prisma.uOMConversion.findFirst({
      where: { org_id: orgId, from_uom_id: dto.from_uom_id, to_uom_id: dto.to_uom_id },
    })
    if (existing) throw new ConflictException('Conversion between these UOMs already exists')

    return this.prisma.$transaction(async (tx) => {
      const forward = await tx.uOMConversion.create({
        data: {
          org_id: orgId,
          from_uom_id: dto.from_uom_id,
          to_uom_id: dto.to_uom_id,
          conversion_factor: dto.conversion_factor,
        },
      })
      // Auto-create the inverse conversion
      await tx.uOMConversion.upsert({
        where: {
          org_id_from_uom_id_to_uom_id: {
            org_id: orgId,
            from_uom_id: dto.to_uom_id,
            to_uom_id: dto.from_uom_id,
          },
        },
        update: { conversion_factor: 1 / dto.conversion_factor },
        create: {
          org_id: orgId,
          from_uom_id: dto.to_uom_id,
          to_uom_id: dto.from_uom_id,
          conversion_factor: 1 / dto.conversion_factor,
        },
      })
      return forward
    })
  }

  async deleteConversion(orgId: string, id: string) {
    const conversion = await this.prisma.uOMConversion.findFirst({
      where: { id, org_id: orgId },
    })
    if (!conversion) throw new NotFoundException('Conversion not found')

    await this.prisma.$transaction([
      this.prisma.uOMConversion.delete({ where: { id } }),
      // Remove the inverse too
      this.prisma.uOMConversion.deleteMany({
        where: {
          org_id: orgId,
          from_uom_id: conversion.to_uom_id,
          to_uom_id: conversion.from_uom_id,
        },
      }),
    ])
  }

  async convert(orgId: string, fromId: string, toId: string, quantity: number): Promise<number> {
    if (fromId === toId) return quantity

    const conversion = await this.prisma.uOMConversion.findFirst({
      where: { org_id: orgId, from_uom_id: fromId, to_uom_id: toId },
    })
    if (!conversion) {
      throw new BadRequestException(`No conversion defined from UOM ${fromId} to ${toId}`)
    }

    return quantity * Number(conversion.conversion_factor)
  }
}
