import { Injectable, BadRequestException } from '@nestjs/common'
import type { Prisma, MovementType, ReferenceType } from '@prisma/client'
import type { PrismaService } from '../../core/database/prisma.service'

export interface LedgerEntryInput {
  orgId: string
  productId: string
  warehouseId: string
  binLocationId?: string
  lotId?: string
  serialNumberId?: string
  movementType: MovementType
  quantity: number                // positive = in, negative = out (stocking UOM)
  unitCostCents: bigint
  referenceType: ReferenceType
  referenceId: string
  reversalOfId?: string
  notes?: string
  createdBy: string
}

@Injectable()
export class InventoryLedgerService {
  /**
   * Write one immutable ledger entry. Must be called inside a transaction.
   * Updates FIFO layers and WAC in the same transaction.
   */
  async writeEntry(
    tx: Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    input: LedgerEntryInput,
  ) {
    const totalCostCents = BigInt(Math.round(input.quantity * Number(input.unitCostCents)))

    const entry = await (tx as any).inventoryLedgerEntry.create({
      data: {
        org_id: input.orgId,
        product_id: input.productId,
        warehouse_id: input.warehouseId,
        bin_location_id: input.binLocationId,
        lot_id: input.lotId,
        serial_number_id: input.serialNumberId,
        movement_type: input.movementType,
        quantity: input.quantity,
        uom_id: await this.getStockingUomId(tx, input.productId),
        unit_cost_cents: input.unitCostCents,
        total_cost_cents: totalCostCents,
        reference_type: input.referenceType,
        reference_id: input.referenceId,
        reversal_of_id: input.reversalOfId,
        notes: input.notes,
        created_by: input.createdBy,
      },
    })

    if (input.quantity > 0) {
      await this.addFifoLayer(tx, input, entry.id)
      await this.updateWac(tx, input, true)
    } else if (input.quantity < 0) {
      await this.consumeFifoLayers(tx, input)
      await this.updateWac(tx, input, false)
    }

    return entry
  }

  private async getStockingUomId(tx: any, productId: string): Promise<string> {
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { stocking_uom_id: true } })
    return product.stocking_uom_id
  }

  private async addFifoLayer(tx: any, input: LedgerEntryInput, receiptId: string) {
    await tx.fifoCostLayer.create({
      data: {
        org_id: input.orgId,
        product_id: input.productId,
        warehouse_id: input.warehouseId,
        receipt_id: receiptId,
        quantity_received: input.quantity,
        quantity_remaining: input.quantity,
        unit_cost_cents: input.unitCostCents,
        received_at: new Date(),
      },
    })
  }

  private async consumeFifoLayers(tx: any, input: LedgerEntryInput) {
    let remaining = Math.abs(input.quantity)

    const layers = await tx.fifoCostLayer.findMany({
      where: {
        org_id: input.orgId,
        product_id: input.productId,
        warehouse_id: input.warehouseId,
        quantity_remaining: { gt: 0 },
      },
      orderBy: { received_at: 'asc' }, // FIFO: oldest first
    })

    for (const layer of layers) {
      if (remaining <= 0) break

      const available = Number(layer.quantity_remaining)
      const consume = Math.min(available, remaining)
      remaining -= consume
      const newRemaining = available - consume

      await tx.fifoCostLayer.update({
        where: { id: layer.id },
        data: {
          quantity_remaining: newRemaining,
          fully_consumed_at: newRemaining === 0 ? new Date() : null,
        },
      })
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient stock: ${remaining} units could not be allocated from FIFO layers`,
      )
    }
  }

  private async updateWac(tx: any, input: LedgerEntryInput, isReceipt: boolean) {
    const key = {
      org_id: input.orgId,
      product_id: input.productId,
      warehouse_id: input.warehouseId,
    }

    const current = await tx.weightedAverageCost.findUnique({
      where: { org_id_product_id_warehouse_id: key },
    })

    if (isReceipt) {
      const currentQty = current ? Number(current.quantity_on_hand) : 0
      const currentCost = current ? Number(current.average_cost_cents) : 0
      const newQty = currentQty + input.quantity
      const newAvgCost =
        newQty > 0
          ? Math.round((currentQty * currentCost + input.quantity * Number(input.unitCostCents)) / newQty)
          : 0

      await tx.weightedAverageCost.upsert({
        where: { org_id_product_id_warehouse_id: key },
        update: { average_cost_cents: BigInt(newAvgCost), quantity_on_hand: newQty },
        create: { ...key, average_cost_cents: BigInt(newAvgCost), quantity_on_hand: newQty },
      })
    } else {
      const outQty = Math.abs(input.quantity)
      const newQty = current ? Math.max(0, Number(current.quantity_on_hand) - outQty) : 0
      await tx.weightedAverageCost.upsert({
        where: { org_id_product_id_warehouse_id: key },
        update: { quantity_on_hand: newQty },
        create: { ...key, average_cost_cents: input.unitCostCents, quantity_on_hand: newQty },
      })
    }
  }

  /** Get current stock level (sum of ledger) for a product+warehouse */
  async getStockLevel(
    tx: any,
    orgId: string,
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    const result = await tx.inventoryLedgerEntry.aggregate({
      where: { org_id: orgId, product_id: productId, warehouse_id: warehouseId },
      _sum: { quantity: true },
    })
    return Number(result._sum.quantity ?? 0)
  }
}
