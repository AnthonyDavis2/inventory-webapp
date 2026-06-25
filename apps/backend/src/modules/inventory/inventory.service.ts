import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { InventoryLedgerService } from './inventory-ledger.service'
import type { CreateAdjustmentDto } from './dto/create-adjustment.dto'
import type { CreateTransferDto } from './dto/create-transfer.dto'
import type { CreateCycleCountDto } from './dto/create-cycle-count.dto'
import type { CreateLotDto } from './dto/create-lot.dto'
import type { UpsertReorderRuleDto } from './dto/reorder-rule.dto'
import { randomUUID } from 'crypto'

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  // ─── Stock Levels ─────────────────────────────────────────────────────────

  async getStockLevels(orgId: string, productId?: string, warehouseId?: string) {
    const where: any = { org_id: orgId }
    if (productId) where.product_id = productId
    if (warehouseId) where.warehouse_id = warehouseId

    // Aggregate ledger to get current qty per product+warehouse
    const rows = await this.prisma.inventoryLedgerEntry.groupBy({
      by: ['product_id', 'warehouse_id'],
      where,
      _sum: { quantity: true },
    })

    const result = rows.map((r) => ({
      product_id: r.product_id,
      warehouse_id: r.warehouse_id,
      quantity_on_hand: Number(r._sum.quantity ?? 0),
    }))

    return result
  }

  async getProductStockSummary(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')

    const [stockLevels, wacCosts, reorderRules] = await Promise.all([
      this.getStockLevels(orgId, productId),
      this.prisma.weightedAverageCost.findMany({
        where: { org_id: orgId, product_id: productId },
        include: { warehouse: { select: { id: true, name: true, code: true } } },
      }),
      this.prisma.reorderRule.findMany({
        where: { org_id: orgId, product_id: productId },
        include: { warehouse: { select: { id: true, name: true, code: true } } },
      }),
    ])

    const totalQty = stockLevels.reduce((acc, s) => acc + s.quantity_on_hand, 0)

    return { product_id: productId, total_quantity_on_hand: totalQty, by_warehouse: stockLevels, wac_costs: wacCosts, reorder_rules: reorderRules }
  }

  async getLedgerHistory(orgId: string, productId: string, warehouseId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.inventoryLedgerEntry.findMany({
      where: {
        org_id: orgId,
        product_id: productId,
        ...(warehouseId && { warehouse_id: warehouseId }),
      },
      orderBy: { created_at: 'desc' },
      take: 200,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        bin_location: { select: { id: true, code: true } },
        lot: { select: { id: true, lot_number: true } },
      },
    })
  }

  // ─── Adjustments ──────────────────────────────────────────────────────────

  async createAdjustment(orgId: string, userId: string, dto: CreateAdjustmentDto) {
    const referenceId = randomUUID()

    const entries = await this.prisma.$transaction(async (tx) => {
      const results = []
      for (const line of dto.lines) {
        await this.assertWarehouseAccess(orgId, line.warehouse_id)
        await this.assertProductAccess(orgId, line.product_id)

        if (line.quantity < 0) {
          const current = await this.ledger.getStockLevel(tx, orgId, line.product_id, line.warehouse_id)
          if (current + line.quantity < 0) {
            throw new BadRequestException(
              `Insufficient stock for product ${line.product_id}: have ${current}, removing ${Math.abs(line.quantity)}`,
            )
          }
        }

        const entry = await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: line.product_id,
          warehouseId: line.warehouse_id,
          binLocationId: line.bin_location_id,
          lotId: line.lot_id,
          serialNumberId: line.serial_number_id,
          movementType: dto.movement_type as any,
          quantity: line.quantity,
          unitCostCents: BigInt(Math.round(line.unit_cost_cents)),
          referenceType: 'INVENTORY_ADJUSTMENT',
          referenceId,
          notes: line.notes ?? dto.notes,
          createdBy: userId,
        })
        results.push(entry)
      }
      return results
    })

    return { reference_id: referenceId, entries }
  }

  async reverseAdjustment(orgId: string, userId: string, entryId: string) {
    const original = await this.prisma.inventoryLedgerEntry.findFirst({
      where: { id: entryId, org_id: orgId },
    })
    if (!original) throw new NotFoundException('Ledger entry not found')

    const alreadyReversed = await this.prisma.inventoryLedgerEntry.findFirst({
      where: { reversal_of_id: entryId },
    })
    if (alreadyReversed) throw new BadRequestException('This entry has already been reversed')

    const referenceId = randomUUID()

    return this.prisma.$transaction(async (tx) => {
      return this.ledger.writeEntry(tx as any, {
        orgId,
        productId: original.product_id,
        warehouseId: original.warehouse_id,
        binLocationId: original.bin_location_id ?? undefined,
        lotId: original.lot_id ?? undefined,
        serialNumberId: original.serial_number_id ?? undefined,
        movementType: original.movement_type,
        quantity: -Number(original.quantity),  // reverse the sign
        unitCostCents: original.unit_cost_cents,
        referenceType: 'INVENTORY_ADJUSTMENT',
        referenceId,
        reversalOfId: entryId,
        notes: `Reversal of entry ${entryId}`,
        createdBy: userId,
      })
    })
  }

  // ─── Transfers ────────────────────────────────────────────────────────────

  async createTransfer(orgId: string, userId: string, dto: CreateTransferDto) {
    if (dto.from_warehouse_id === dto.to_warehouse_id) {
      throw new BadRequestException('Source and destination warehouse must be different')
    }

    await Promise.all([
      this.assertWarehouseAccess(orgId, dto.from_warehouse_id),
      this.assertWarehouseAccess(orgId, dto.to_warehouse_id),
    ])

    const referenceId = randomUUID()

    const entries = await this.prisma.$transaction(async (tx) => {
      const results = []
      for (const line of dto.lines) {
        await this.assertProductAccess(orgId, line.product_id)

        if (line.quantity <= 0) throw new BadRequestException('Transfer quantity must be positive')

        const currentStock = await this.ledger.getStockLevel(tx, orgId, line.product_id, dto.from_warehouse_id)
        if (currentStock < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${line.product_id} in source warehouse: have ${currentStock}, transferring ${line.quantity}`,
          )
        }

        // Get current unit cost from WAC for the source warehouse
        const wac = await (tx as any).weightedAverageCost.findUnique({
          where: {
            org_id_product_id_warehouse_id: {
              org_id: orgId,
              product_id: line.product_id,
              warehouse_id: dto.from_warehouse_id,
            },
          },
        })
        const unitCostCents = wac ? wac.average_cost_cents : BigInt(0)

        // OUT from source
        const outEntry = await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: line.product_id,
          warehouseId: dto.from_warehouse_id,
          binLocationId: line.bin_location_id_from,
          lotId: line.lot_id,
          serialNumberId: line.serial_number_id,
          movementType: 'INVENTORY_TRANSFER',
          quantity: -line.quantity,
          unitCostCents,
          referenceType: 'INVENTORY_TRANSFER',
          referenceId,
          notes: dto.notes,
          createdBy: userId,
        })

        // IN to destination
        const inEntry = await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: line.product_id,
          warehouseId: dto.to_warehouse_id,
          binLocationId: line.bin_location_id_to,
          lotId: line.lot_id,
          serialNumberId: line.serial_number_id,
          movementType: 'INVENTORY_TRANSFER',
          quantity: line.quantity,
          unitCostCents,             // cost transfers at same value
          referenceType: 'INVENTORY_TRANSFER',
          referenceId,
          notes: dto.notes,
          createdBy: userId,
        })

        results.push({ out: outEntry, in: inEntry })
      }
      return results
    })

    return { reference_id: referenceId, entries }
  }

  // ─── Cycle Counts ─────────────────────────────────────────────────────────

  async createCycleCount(orgId: string, userId: string, dto: CreateCycleCountDto) {
    await this.assertWarehouseAccess(orgId, dto.warehouse_id)

    const referenceId = randomUUID()
    const adjustmentEntries: Array<{ product_id: string; system_qty: number; counted_qty: number; variance: number; entry: any }> = []

    await this.prisma.$transaction(async (tx) => {
      for (const line of dto.lines) {
        await this.assertProductAccess(orgId, line.product_id)

        const currentQty = await this.ledger.getStockLevel(tx, orgId, line.product_id, dto.warehouse_id)
        const variance = line.counted_quantity - currentQty

        if (variance === 0) continue

        const wac = await (tx as any).weightedAverageCost.findUnique({
          where: {
            org_id_product_id_warehouse_id: {
              org_id: orgId,
              product_id: line.product_id,
              warehouse_id: dto.warehouse_id,
            },
          },
        })
        const unitCostCents = wac ? wac.average_cost_cents : BigInt(0)

        const entry = await this.ledger.writeEntry(tx as any, {
          orgId,
          productId: line.product_id,
          warehouseId: dto.warehouse_id,
          binLocationId: line.bin_location_id,
          lotId: line.lot_id,
          movementType: 'CYCLE_COUNT',
          quantity: variance,
          unitCostCents,
          referenceType: 'INVENTORY_ADJUSTMENT',
          referenceId,
          notes: `Cycle count adjustment — counted: ${line.counted_quantity}, system: ${currentQty}, variance: ${variance}`,
          createdBy: userId,
        })
        adjustmentEntries.push({ product_id: line.product_id, system_qty: currentQty, counted_qty: line.counted_quantity, variance, entry })
      }
    })

    return { reference_id: referenceId, adjustments: adjustmentEntries }
  }

  // ─── Lots ─────────────────────────────────────────────────────────────────

  async listLots(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, org_id: orgId } })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.lot.findMany({
      where: { org_id: orgId, product_id: productId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    })
  }

  async createLot(orgId: string, dto: CreateLotDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.product_id, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')
    if (!product.is_lot_tracked) {
      throw new BadRequestException('Product is not lot-tracked. Enable is_lot_tracked first.')
    }

    const conflict = await this.prisma.lot.findFirst({
      where: { org_id: orgId, product_id: dto.product_id, lot_number: dto.lot_number, deleted_at: null },
    })
    if (conflict) throw new ConflictException(`Lot number "${dto.lot_number}" already exists for this product`)

    return this.prisma.lot.create({
      data: {
        org_id: orgId,
        product_id: dto.product_id,
        lot_number: dto.lot_number,
        batch_number: dto.batch_number,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
        manufactured_at: dto.manufactured_at ? new Date(dto.manufactured_at) : undefined,
        is_quarantine: dto.is_quarantine ?? false,
        notes: dto.notes,
      },
    })
  }

  async updateLot(orgId: string, lotId: string, dto: Partial<CreateLotDto>) {
    const lot = await this.prisma.lot.findFirst({ where: { id: lotId, org_id: orgId, deleted_at: null } })
    if (!lot) throw new NotFoundException('Lot not found')

    return this.prisma.lot.update({
      where: { id: lotId },
      data: {
        batch_number: dto.batch_number,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
        manufactured_at: dto.manufactured_at ? new Date(dto.manufactured_at) : undefined,
        is_quarantine: dto.is_quarantine,
        notes: dto.notes,
      },
    })
  }

  // ─── Serial Numbers ───────────────────────────────────────────────────────

  async listSerials(orgId: string, productId: string, status?: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, org_id: orgId } })
    if (!product) throw new NotFoundException('Product not found')

    return this.prisma.serialNumber.findMany({
      where: {
        org_id: orgId,
        product_id: productId,
        deleted_at: null,
        ...(status && { status: status as any }),
      },
      orderBy: { created_at: 'desc' },
    })
  }

  async createSerial(orgId: string, productId: string, serialNumber: string, lotId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')
    if (!product.is_serial_tracked) {
      throw new BadRequestException('Product is not serial-tracked. Enable is_serial_tracked first.')
    }

    const conflict = await this.prisma.serialNumber.findFirst({
      where: { org_id: orgId, product_id: productId, serial_number: serialNumber, deleted_at: null },
    })
    if (conflict) throw new ConflictException(`Serial number "${serialNumber}" already exists for this product`)

    return this.prisma.serialNumber.create({
      data: { org_id: orgId, product_id: productId, serial_number: serialNumber, status: 'IN_STOCK', lot_id: lotId },
    })
  }

  // ─── Reorder Rules ────────────────────────────────────────────────────────

  async listReorderRules(orgId: string) {
    return this.prisma.reorderRule.findMany({
      where: { org_id: orgId },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'asc' },
    })
  }

  async upsertReorderRule(orgId: string, dto: UpsertReorderRuleDto) {
    await Promise.all([
      this.assertProductAccess(orgId, dto.product_id),
      this.assertWarehouseAccess(orgId, dto.warehouse_id),
    ])

    return this.prisma.reorderRule.upsert({
      where: {
        org_id_product_id_warehouse_id: {
          org_id: orgId,
          product_id: dto.product_id,
          warehouse_id: dto.warehouse_id,
        },
      },
      update: {
        reorder_point: dto.reorder_point,
        reorder_quantity: dto.reorder_quantity,
        safety_stock: dto.safety_stock,
        lead_time_days: dto.lead_time_days,
        preferred_vendor_id: dto.preferred_vendor_id,
      },
      create: {
        org_id: orgId,
        product_id: dto.product_id,
        warehouse_id: dto.warehouse_id,
        reorder_point: dto.reorder_point,
        reorder_quantity: dto.reorder_quantity,
        safety_stock: dto.safety_stock,
        lead_time_days: dto.lead_time_days,
        preferred_vendor_id: dto.preferred_vendor_id,
      },
    })
  }

  async deleteReorderRule(orgId: string, id: string) {
    const rule = await this.prisma.reorderRule.findFirst({ where: { id, org_id: orgId } })
    if (!rule) throw new NotFoundException('Reorder rule not found')
    await this.prisma.reorderRule.delete({ where: { id } })
  }

  /** Check which products are below their reorder point — used for dashboard alerts */
  async getBelowReorderPoint(orgId: string) {
    const rules = await this.prisma.reorderRule.findMany({
      where: { org_id: orgId },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    })

    const stockLevels = await this.getStockLevels(orgId)
    const stockMap = new Map<string, number>()
    for (const s of stockLevels) {
      stockMap.set(`${s.product_id}::${s.warehouse_id}`, s.quantity_on_hand)
    }

    return rules
      .map((rule) => {
        const qty = stockMap.get(`${rule.product_id}::${rule.warehouse_id}`) ?? 0
        return { rule, current_qty: qty, needs_reorder: qty <= Number(rule.reorder_point) }
      })
      .filter((r) => r.needs_reorder)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertProductAccess(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException(`Product ${productId} not found`)
    return product
  }

  private async assertWarehouseAccess(orgId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, org_id: orgId, deleted_at: null },
    })
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`)
    return warehouse
  }
}
