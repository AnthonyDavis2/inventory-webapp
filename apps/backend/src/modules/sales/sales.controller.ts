import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SalesService } from './sales.service'
import { CreateQuoteDto } from './dto/create-quote.dto'
import { CreateSalesOrderDto } from './dto/create-sales-order.dto'
import { CreateShipmentDto } from './dto/create-shipment.dto'
import { CreateRmaDto } from './dto/create-rma.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Sales')
@ApiBearerAuth()
@Controller()
@UseGuards(ReadOnlyGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ─── Quotes ───────────────────────────────────────────────────────────────

  @Get('quotes')
  listQuotes(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('customer_id') customerId?: string) {
    return this.salesService.listQuotes(user.orgId, status, customerId)
  }

  @Get('quotes/:id')
  getQuote(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.getQuote(user.orgId, id)
  }

  @Post('quotes')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  createQuote(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.salesService.createQuote(user.orgId, user.sub, dto)
  }

  @Post('quotes/:id/:action')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  updateQuoteStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('action') action: string) {
    return this.salesService.updateQuoteStatus(user.orgId, user.sub, id, action)
  }

  @Post('quotes/:id/convert')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  convertToSO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.convertQuoteToSO(user.orgId, user.sub, id)
  }

  @Delete('quotes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  deleteQuote(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.deleteQuote(user.orgId, user.sub, id)
  }

  // ─── Sales Orders ─────────────────────────────────────────────────────────

  @Get('sales-orders')
  listSOs(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('customer_id') customerId?: string) {
    return this.salesService.listSOs(user.orgId, status, customerId)
  }

  @Get('sales-orders/:id')
  getSO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.getSO(user.orgId, id)
  }

  @Post('sales-orders')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  createSO(@CurrentUser() user: JwtPayload, @Body() dto: CreateSalesOrderDto) {
    return this.salesService.createSO(user.orgId, user.sub, dto)
  }

  @Post('sales-orders/:id/:action')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  updateSOStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('action') action: string) {
    return this.salesService.updateSOStatus(user.orgId, user.sub, id, action)
  }

  @Delete('sales-orders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deleteSO(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.deleteSO(user.orgId, user.sub, id)
  }

  // ─── Shipments ────────────────────────────────────────────────────────────

  @Post('sales-orders/:id/shipments')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE_STAFF')
  createShipment(@CurrentUser() user: JwtPayload, @Param('id') soId: string, @Body() dto: CreateShipmentDto) {
    return this.salesService.createShipment(user.orgId, user.sub, soId, dto)
  }

  // ─── Returns ──────────────────────────────────────────────────────────────

  @Post('rmas')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  createRma(@CurrentUser() user: JwtPayload, @Body() dto: CreateRmaDto) {
    return this.salesService.createRma(user.orgId, user.sub, dto)
  }

  @Post('rmas/:id/:action')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateRmaStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('action') action: string) {
    return this.salesService.updateRmaStatus(user.orgId, user.sub, id, action)
  }
}
