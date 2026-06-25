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
import { InventoryService } from './inventory.service'
import { CreateAdjustmentDto } from './dto/create-adjustment.dto'
import { CreateTransferDto } from './dto/create-transfer.dto'
import { CreateCycleCountDto } from './dto/create-cycle-count.dto'
import { CreateLotDto } from './dto/create-lot.dto'
import { UpsertReorderRuleDto } from './dto/reorder-rule.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(ReadOnlyGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ─── Stock Levels ─────────────────────────────────────────────────────────

  @Get('stock')
  @ApiOperation({ summary: 'Get stock levels, optionally filtered by product or warehouse' })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getStockLevels(
    @CurrentUser() user: JwtPayload,
    @Query('product_id') productId?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.inventoryService.getStockLevels(user.orgId, productId, warehouseId)
  }

  @Get('stock/products/:productId')
  @ApiOperation({ summary: 'Full stock summary for a product: by warehouse, WAC costs, reorder rules' })
  getProductStockSummary(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.inventoryService.getProductStockSummary(user.orgId, productId)
  }

  @Get('stock/reorder-alerts')
  @ApiOperation({ summary: 'Products currently at or below their reorder point' })
  getBelowReorderPoint(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getBelowReorderPoint(user.orgId)
  }

  @Get('ledger/:productId')
  @ApiOperation({ summary: 'Ledger history for a product (last 200 entries)' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getLedgerHistory(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.inventoryService.getLedgerHistory(user.orgId, productId, warehouseId)
  }

  // ─── Adjustments ──────────────────────────────────────────────────────────

  @Post('adjustments')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Post a multi-line inventory adjustment (or opening balance)' })
  createAdjustment(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdjustmentDto) {
    return this.inventoryService.createAdjustment(user.orgId, user.sub, dto)
  }

  @Post('adjustments/:entryId/reverse')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reverse a single ledger entry (creates an offsetting entry)' })
  reverseAdjustment(@CurrentUser() user: JwtPayload, @Param('entryId') entryId: string) {
    return this.inventoryService.reverseAdjustment(user.orgId, user.sub, entryId)
  }

  // ─── Transfers ────────────────────────────────────────────────────────────

  @Post('transfers')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Transfer stock between warehouses. Creates OUT+IN ledger pair per line.' })
  createTransfer(@CurrentUser() user: JwtPayload, @Body() dto: CreateTransferDto) {
    return this.inventoryService.createTransfer(user.orgId, user.sub, dto)
  }

  // ─── Cycle Counts ─────────────────────────────────────────────────────────

  @Post('cycle-counts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Submit a cycle count. Automatically posts variance adjustments.' })
  createCycleCount(@CurrentUser() user: JwtPayload, @Body() dto: CreateCycleCountDto) {
    return this.inventoryService.createCycleCount(user.orgId, user.sub, dto)
  }

  // ─── Lots ─────────────────────────────────────────────────────────────────

  @Get('lots/:productId')
  listLots(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.inventoryService.listLots(user.orgId, productId)
  }

  @Post('lots')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createLot(@CurrentUser() user: JwtPayload, @Body() dto: CreateLotDto) {
    return this.inventoryService.createLot(user.orgId, dto)
  }

  @Patch('lots/:lotId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateLot(@CurrentUser() user: JwtPayload, @Param('lotId') lotId: string, @Body() dto: CreateLotDto) {
    return this.inventoryService.updateLot(user.orgId, lotId, dto)
  }

  // ─── Serial Numbers ───────────────────────────────────────────────────────

  @Get('serials/:productId')
  @ApiQuery({ name: 'status', required: false, enum: ['IN_STOCK', 'SOLD', 'RETURNED', 'SCRAPPED'] })
  listSerials(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.listSerials(user.orgId, productId, status)
  }

  @Post('serials/:productId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createSerial(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Body() body: { serial_number: string; lot_id?: string },
  ) {
    return this.inventoryService.createSerial(user.orgId, productId, body.serial_number, body.lot_id)
  }

  // ─── Reorder Rules ────────────────────────────────────────────────────────

  @Get('reorder-rules')
  listReorderRules(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.listReorderRules(user.orgId)
  }

  @Post('reorder-rules')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create or update a reorder rule (upsert by product+warehouse)' })
  upsertReorderRule(@CurrentUser() user: JwtPayload, @Body() dto: UpsertReorderRuleDto) {
    return this.inventoryService.upsertReorderRule(user.orgId, dto)
  }

  @Delete('reorder-rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteReorderRule(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.inventoryService.deleteReorderRule(user.orgId, id)
  }
}
