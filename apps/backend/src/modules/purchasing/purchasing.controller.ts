import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { PurchasingService } from './purchasing.service'
import { CreatePODto } from './dto/create-po.dto'
import { CreateReceiptDto } from './dto/create-receipt.dto'
import { AddLandedCostDto } from './dto/add-landed-cost.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Purchasing')
@ApiBearerAuth()
@Controller('purchasing')
@UseGuards(ReadOnlyGuard)
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  // ─── Purchase Orders ──────────────────────────────────────────────────────

  @Get('pos')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendor_id', required: false })
  listPOs(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('vendor_id') vendorId?: string,
  ) {
    return this.purchasingService.listPOs(user.orgId, status, vendorId)
  }

  @Get('pos/:id')
  getPO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.getPO(user.orgId, id)
  }

  @Post('pos')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a PO in DRAFT status with one or more lines' })
  createPO(@CurrentUser() user: JwtPayload, @Body() dto: CreatePODto) {
    return this.purchasingService.createPO(user.orgId, user.sub, dto)
  }

  @Patch('pos/:id/:action')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Transition PO status: submit | approve | send | cancel | reopen' })
  updatePOStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('action') action: string,
  ) {
    return this.purchasingService.updatePOStatus(user.orgId, user.sub, id, action)
  }

  @Delete('pos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a DRAFT PO (soft delete)' })
  deletePO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.deletePO(user.orgId, user.sub, id)
  }

  // ─── Receipts ─────────────────────────────────────────────────────────────

  @Get('pos/:poId/receipts')
  listReceipts(@CurrentUser() user: JwtPayload, @Param('poId') poId: string) {
    return this.purchasingService.listReceipts(user.orgId, poId)
  }

  @Post('pos/:poId/receipts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record receipt of goods against a PO. Posts inventory ledger entries immediately.' })
  createReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('poId') poId: string,
    @Body() dto: CreateReceiptDto,
  ) {
    return this.purchasingService.createReceipt(user.orgId, user.sub, poId, dto)
  }

  @Patch('pos/:poId/receipts/:receiptId/post')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Mark a receipt as posted (locks it from further edits)' })
  postReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('poId') poId: string,
    @Param('receiptId') receiptId: string,
  ) {
    return this.purchasingService.postReceipt(user.orgId, user.sub, poId, receiptId)
  }

  // ─── Landed Costs ─────────────────────────────────────────────────────────

  @Post('pos/:poId/receipts/:receiptId/landed-costs')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a landed cost (freight, duty, etc.) to a receipt' })
  addLandedCost(
    @CurrentUser() user: JwtPayload,
    @Param('poId') poId: string,
    @Param('receiptId') receiptId: string,
    @Body() dto: AddLandedCostDto,
  ) {
    return this.purchasingService.addLandedCost(user.orgId, poId, receiptId, dto)
  }

  @Delete('pos/:poId/receipts/:receiptId/landed-costs/:lcId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteLandedCost(
    @CurrentUser() user: JwtPayload,
    @Param('poId') poId: string,
    @Param('receiptId') receiptId: string,
    @Param('lcId') lcId: string,
  ) {
    return this.purchasingService.deleteLandedCost(user.orgId, poId, receiptId, lcId)
  }
}
