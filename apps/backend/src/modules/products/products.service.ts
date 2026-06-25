import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'
import type { CreateCategoryDto } from './dto/create-category.dto'
import type { CreateProductDto } from './dto/create-product.dto'
import type { UpdateProductDto } from './dto/update-product.dto'
import type { CreateVariantDto } from './dto/create-variant.dto'
import type { CreateBarcodeDto } from './dto/create-barcode.dto'
import type { ListProductsDto } from './dto/list-products.dto'

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async listCategories(orgId: string) {
    return this.prisma.productCategory.findMany({
      where: { org_id: orgId, deleted_at: null },
      orderBy: { name: 'asc' },
      include: {
        children: {
          where: { deleted_at: null },
          orderBy: { name: 'asc' },
        },
      },
    })
  }

  async createCategory(orgId: string, dto: CreateCategoryDto) {
    if (dto.parent_id) {
      const parent = await this.prisma.productCategory.findFirst({
        where: { id: dto.parent_id, org_id: orgId, deleted_at: null },
      })
      if (!parent) throw new NotFoundException('Parent category not found')
    }
    return this.prisma.productCategory.create({
      data: { org_id: orgId, name: dto.name, description: dto.description, parent_id: dto.parent_id },
    })
  }

  async updateCategory(orgId: string, id: string, dto: Partial<CreateCategoryDto>) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!category) throw new NotFoundException('Category not found')

    if (dto.parent_id && dto.parent_id === id) {
      throw new BadRequestException('Category cannot be its own parent')
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: { name: dto.name, description: dto.description, parent_id: dto.parent_id },
    })
  }

  async deleteCategory(orgId: string, id: string) {
    const category = await this.prisma.productCategory.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: { children: { where: { deleted_at: null } } },
    })
    if (!category) throw new NotFoundException('Category not found')
    if (category.children.length > 0) {
      throw new BadRequestException('Cannot delete a category that has subcategories')
    }
    const inUse = await this.prisma.product.findFirst({
      where: { org_id: orgId, category_id: id, deleted_at: null },
    })
    if (inUse) throw new BadRequestException('Cannot delete a category that has products assigned to it')

    await this.prisma.productCategory.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  async list(orgId: string, dto: ListProductsDto) {
    const page = dto.page ?? 1
    const limit = dto.limit ?? 50
    const skip = (page - 1) * limit

    const where: Prisma.ProductWhereInput = {
      org_id: orgId,
      deleted_at: null,
      ...(dto.type && { type: dto.type }),
      ...(dto.category_id && { category_id: dto.category_id }),
      ...(dto.q && {
        OR: [
          { sku: { contains: dto.q, mode: 'insensitive' } },
          { name: { contains: dto.q, mode: 'insensitive' } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          stocking_uom: { select: { id: true, name: true, abbreviation: true } },
          _count: { select: { variants: true, barcodes: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async getOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: {
        category: { select: { id: true, name: true } },
        purchase_uom: { select: { id: true, name: true, abbreviation: true } },
        stocking_uom: { select: { id: true, name: true, abbreviation: true } },
        sales_uom: { select: { id: true, name: true, abbreviation: true } },
        variants: { where: { deleted_at: null }, orderBy: { sku: 'asc' } },
        barcodes: { orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }] },
        images: { orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }] },
      },
    })
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  async create(orgId: string, userId: string, dto: CreateProductDto) {
    const skuConflict = await this.prisma.product.findFirst({
      where: { org_id: orgId, sku: dto.sku, deleted_at: null },
    })
    if (skuConflict) throw new ConflictException(`SKU "${dto.sku}" already exists`)

    await this.assertUomsExist(orgId, dto.purchase_uom_id, dto.stocking_uom_id, dto.sales_uom_id)

    if (dto.category_id) {
      const cat = await this.prisma.productCategory.findFirst({
        where: { id: dto.category_id, org_id: orgId, deleted_at: null },
      })
      if (!cat) throw new NotFoundException('Category not found')
    }

    return this.prisma.product.create({
      data: {
        org_id: orgId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        category_id: dto.category_id,
        purchase_uom_id: dto.purchase_uom_id,
        stocking_uom_id: dto.stocking_uom_id,
        sales_uom_id: dto.sales_uom_id,
        is_lot_tracked: dto.is_lot_tracked ?? false,
        is_serial_tracked: dto.is_serial_tracked ?? false,
        has_expiry: dto.has_expiry ?? false,
        expiry_alert_days: dto.expiry_alert_days,
        is_purchasable: dto.is_purchasable ?? true,
        is_sellable: dto.is_sellable ?? true,
        is_manufactured: dto.is_manufactured ?? false,
        notes: dto.notes,
        created_by: userId,
        updated_by: userId,
      },
    })
  }

  async update(orgId: string, userId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')

    if (dto.purchase_uom_id || dto.stocking_uom_id || dto.sales_uom_id) {
      await this.assertUomsExist(
        orgId,
        dto.purchase_uom_id ?? product.purchase_uom_id,
        dto.stocking_uom_id ?? product.stocking_uom_id,
        dto.sales_uom_id ?? product.sales_uom_id,
      )
    }

    if (dto.category_id) {
      const cat = await this.prisma.productCategory.findFirst({
        where: { id: dto.category_id, org_id: orgId, deleted_at: null },
      })
      if (!cat) throw new NotFoundException('Category not found')
    }

    // Disallow changing stocking UOM once inventory exists
    if (dto.stocking_uom_id && dto.stocking_uom_id !== product.stocking_uom_id) {
      const hasStock = await this.prisma.inventoryLedgerEntry.findFirst({ where: { product_id: id } })
      if (hasStock) {
        throw new BadRequestException('Cannot change the stocking UOM after inventory transactions exist')
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: { ...dto, updated_by: userId },
    })
  }

  async delete(orgId: string, userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')

    const hasStock = await this.prisma.inventoryLedgerEntry.findFirst({ where: { product_id: id } })
    if (hasStock) {
      throw new BadRequestException('Cannot delete a product with inventory history. Archive it instead.')
    }

    await this.prisma.product.update({
      where: { id },
      data: { deleted_at: new Date(), deleted_by: userId },
    })
  }

  // ─── Variants ─────────────────────────────────────────────────────────────

  async createVariant(orgId: string, productId: string, dto: CreateVariantDto) {
    await this.assertProductAccess(orgId, productId)

    const skuConflict = await this.prisma.productVariant.findFirst({
      where: { org_id: orgId, sku: dto.sku, deleted_at: null },
    })
    if (skuConflict) throw new ConflictException(`Variant SKU "${dto.sku}" already exists`)

    return this.prisma.productVariant.create({
      data: { org_id: orgId, product_id: productId, sku: dto.sku, name: dto.name, attributes: dto.attributes },
    })
  }

  async updateVariant(orgId: string, productId: string, variantId: string, dto: Partial<CreateVariantDto>) {
    await this.assertProductAccess(orgId, productId)
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product_id: productId, deleted_at: null },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { name: dto.name, attributes: dto.attributes as Prisma.JsonObject },
    })
  }

  async deleteVariant(orgId: string, productId: string, variantId: string) {
    await this.assertProductAccess(orgId, productId)
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product_id: productId, deleted_at: null },
    })
    if (!variant) throw new NotFoundException('Variant not found')

    await this.prisma.productVariant.update({ where: { id: variantId }, data: { deleted_at: new Date() } })
  }

  // ─── Barcodes ─────────────────────────────────────────────────────────────

  async createBarcode(orgId: string, productId: string, dto: CreateBarcodeDto) {
    await this.assertProductAccess(orgId, productId)

    const conflict = await this.prisma.productBarcode.findFirst({
      where: { org_id: orgId, barcode: dto.barcode },
    })
    if (conflict) throw new ConflictException(`Barcode "${dto.barcode}" is already assigned to another product`)

    if (dto.variant_id) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variant_id, product_id: productId, deleted_at: null },
      })
      if (!variant) throw new NotFoundException('Variant not found')
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.is_primary) {
        await tx.productBarcode.updateMany({
          where: { product_id: productId },
          data: { is_primary: false },
        })
      }
      return tx.productBarcode.create({
        data: {
          org_id: orgId,
          product_id: productId,
          variant_id: dto.variant_id,
          barcode: dto.barcode,
          barcode_type: dto.barcode_type,
          is_primary: dto.is_primary ?? false,
        },
      })
    })
  }

  async deleteBarcode(orgId: string, productId: string, barcodeId: string) {
    await this.assertProductAccess(orgId, productId)
    const barcode = await this.prisma.productBarcode.findFirst({
      where: { id: barcodeId, product_id: productId },
    })
    if (!barcode) throw new NotFoundException('Barcode not found')
    await this.prisma.productBarcode.delete({ where: { id: barcodeId } })
  }

  // ─── Images ───────────────────────────────────────────────────────────────

  async getUploadUrl(orgId: string, productId: string, filename: string, contentType: string) {
    await this.assertProductAccess(orgId, productId)
    const key = `${orgId}/products/${productId}/${Date.now()}-${filename}`
    const uploadUrl = await this.storage.getSignedUploadUrl(key, contentType, 300)
    return { key, upload_url: uploadUrl }
  }

  async confirmImage(orgId: string, productId: string, key: string, isPrimary: boolean) {
    await this.assertProductAccess(orgId, productId)
    const downloadUrl = await this.storage.getSignedDownloadUrl(key, 3600 * 24 * 7)

    return this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.productImage.updateMany({ where: { product_id: productId }, data: { is_primary: false } })
      }
      const maxSort = await tx.productImage.aggregate({
        where: { product_id: productId },
        _max: { sort_order: true },
      })
      return tx.productImage.create({
        data: {
          org_id: orgId,
          product_id: productId,
          storage_key: key,
          url: downloadUrl,
          is_primary: isPrimary,
          sort_order: (maxSort._max.sort_order ?? -1) + 1,
        },
      })
    })
  }

  async deleteImage(orgId: string, productId: string, imageId: string) {
    await this.assertProductAccess(orgId, productId)
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, product_id: productId } })
    if (!image) throw new NotFoundException('Image not found')
    await this.prisma.productImage.delete({ where: { id: imageId } })
  }

  // ─── Lookup by barcode (for receiving / scanning flows) ───────────────────

  async findByBarcode(orgId: string, barcode: string) {
    const record = await this.prisma.productBarcode.findFirst({
      where: { org_id: orgId, barcode },
      include: {
        product: {
          include: {
            stocking_uom: { select: { id: true, name: true, abbreviation: true } },
          },
        },
        variant: true,
      },
    })
    if (!record) throw new NotFoundException('No product found for this barcode')
    return record
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertProductAccess(orgId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, org_id: orgId, deleted_at: null },
    })
    if (!product) throw new NotFoundException('Product not found')
    return product
  }

  private async assertUomsExist(orgId: string, purchaseId: string, stockingId: string, salesId: string) {
    const uomIds = [...new Set([purchaseId, stockingId, salesId])]
    const found = await this.prisma.unitOfMeasure.findMany({
      where: {
        id: { in: uomIds },
        deleted_at: null,
        OR: [{ org_id: orgId }, { org_id: null }],
      },
      select: { id: true },
    })
    if (found.length !== uomIds.length) {
      throw new NotFoundException('One or more UOM IDs are invalid')
    }
  }
}
