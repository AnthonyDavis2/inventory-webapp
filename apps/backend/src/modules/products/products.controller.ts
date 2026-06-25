import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { CreateVariantDto } from './dto/create-variant.dto'
import { CreateBarcodeDto } from './dto/create-barcode.dto'
import { ListProductsDto } from './dto/list-products.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(ReadOnlyGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  @Get('categories')
  listCategories(@CurrentUser() user: JwtPayload) {
    return this.productsService.listCategories(user.orgId)
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(user.orgId, dto)
  }

  @Patch('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.productsService.updateCategory(user.orgId, id, dto)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.deleteCategory(user.orgId, id)
  }

  // ─── Barcode lookup (before /:id routes to avoid route collision) ─────────

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Look up a product by barcode value (for scan-to-receive)' })
  findByBarcode(@CurrentUser() user: JwtPayload, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(user.orgId, barcode)
  }

  // ─── Products ─────────────────────────────────────────────────────────────

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() dto: ListProductsDto) {
    return this.productsService.list(user.orgId, dto)
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.getOne(user.orgId, id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.orgId, user.sub, dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.orgId, user.sub, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Soft-delete a product. Blocked if inventory history exists.' })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.delete(user.orgId, user.sub, id)
  }

  // ─── Variants ─────────────────────────────────────────────────────────────

  @Post(':id/variants')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createVariant(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.createVariant(user.orgId, id, dto)
  }

  @Patch(':id/variants/:variantId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateVariant(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.updateVariant(user.orgId, id, variantId, dto)
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteVariant(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('variantId') variantId: string) {
    return this.productsService.deleteVariant(user.orgId, id, variantId)
  }

  // ─── Barcodes ─────────────────────────────────────────────────────────────

  @Post(':id/barcodes')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createBarcode(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateBarcodeDto) {
    return this.productsService.createBarcode(user.orgId, id, dto)
  }

  @Delete(':id/barcodes/:barcodeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteBarcode(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('barcodeId') barcodeId: string) {
    return this.productsService.deleteBarcode(user.orgId, id, barcodeId)
  }

  // ─── Images ───────────────────────────────────────────────────────────────

  @Post(':id/images/upload-url')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get a pre-signed R2 upload URL. Then POST the file, then call /confirm.' })
  getUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { filename: string; content_type: string },
  ) {
    return this.productsService.getUploadUrl(user.orgId, id, body.filename, body.content_type)
  }

  @Post(':id/images/confirm')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Confirm an uploaded image and save the DB record' })
  confirmImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { key: string; is_primary?: boolean },
  ) {
    return this.productsService.confirmImage(user.orgId, id, body.key, body.is_primary ?? false)
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteImage(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.deleteImage(user.orgId, id, imageId)
  }
}
