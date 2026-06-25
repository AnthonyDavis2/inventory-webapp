import {
  Controller, Get, Post, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ManufacturingService } from './manufacturing.service'
import { CreateBOMDto } from './dto/create-bom.dto'
import { CreateWorkOrderDto } from './dto/create-work-order.dto'
import { RecordLaborDto } from './dto/record-labor.dto'
import { RecordScrapDto } from './dto/record-scrap.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Controller()
@UseGuards(ReadOnlyGuard)
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  // ─── BOMs ─────────────────────────────────────────────────────────────────

  @Get('boms')
  listBOMs(@CurrentUser() user: JwtPayload, @Query('product_id') productId?: string) {
    return this.manufacturingService.listBOMs(user.orgId, productId)
  }

  @Get('boms/:id')
  getBOM(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.manufacturingService.getBOM(user.orgId, id)
  }

  @Post('boms')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  createBOM(@CurrentUser() user: JwtPayload, @Body() dto: CreateBOMDto) {
    return this.manufacturingService.createBOM(user.orgId, user.sub, dto)
  }

  @Post('boms/:id/versions')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  createBOMVersion(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: Omit<CreateBOMDto, 'product_id' | 'name'>) {
    return this.manufacturingService.createBOMVersion(user.orgId, id, user.sub, dto)
  }

  @Post('boms/:id/versions/:versionId/activate')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  activateBOMVersion(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.manufacturingService.activateBOMVersion(user.orgId, id, versionId)
  }

  // ─── Work Orders ──────────────────────────────────────────────────────────

  @Get('work-orders')
  listWOs(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.manufacturingService.listWOs(user.orgId, status)
  }

  @Get('work-orders/:id')
  getWO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.manufacturingService.getWO(user.orgId, id)
  }

  @Post('work-orders')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  createWO(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkOrderDto) {
    return this.manufacturingService.createWO(user.orgId, user.sub, dto)
  }

  @Post('work-orders/:id/:action')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  updateWOStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('action') action: string) {
    return this.manufacturingService.updateWOStatus(user.orgId, user.sub, id, action)
  }

  @Post('work-orders/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  completeWO(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: { qc_passed: boolean; qc_notes?: string }) {
    return this.manufacturingService.completeWO(user.orgId, user.sub, id, body.qc_passed, body.qc_notes)
  }

  @Post('work-orders/:id/material-lines/:lineId/consume')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF', 'WAREHOUSE_STAFF')
  recordMaterialConsumption(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.manufacturingService.recordMaterialConsumption(user.orgId, id, lineId, quantity)
  }

  @Post('work-orders/:id/produced')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  recordProducedQty(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('quantity') quantity: number) {
    return this.manufacturingService.recordProducedQty(user.orgId, id, quantity)
  }

  @Post('work-orders/:id/labor')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  recordLabor(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RecordLaborDto) {
    return this.manufacturingService.recordLabor(user.orgId, user.sub, id, dto)
  }

  @Post('work-orders/:id/scrap')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'PRODUCTION_STAFF')
  recordScrap(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RecordScrapDto) {
    return this.manufacturingService.recordScrap(user.orgId, user.sub, id, dto)
  }
}
