import {
  Controller, Get, Post, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { InvoicingService } from './invoicing.service'
import { CreateInvoiceDto } from './dto/create-invoice.dto'
import { RecordPaymentDto } from './dto/record-payment.dto'
import { CreateCreditMemoDto } from './dto/create-credit-memo.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Invoicing')
@ApiBearerAuth()
@Controller()
@UseGuards(ReadOnlyGuard)
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get('invoices')
  listInvoices(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('customer_id') customerId?: string) {
    return this.invoicingService.listInvoices(user.orgId, status, customerId)
  }

  @Get('invoices/aged-receivables')
  getAgedReceivables(@CurrentUser() user: JwtPayload) {
    return this.invoicingService.getAgedReceivables(user.orgId)
  }

  @Get('invoices/:id')
  getInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicingService.getInvoice(user.orgId, id)
  }

  @Post('invoices')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  createInvoice(@CurrentUser() user: JwtPayload, @Body() dto: CreateInvoiceDto) {
    return this.invoicingService.createInvoice(user.orgId, user.sub, dto)
  }

  @Post('sales-orders/:soId/invoice')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  createFromSO(@CurrentUser() user: JwtPayload, @Param('soId') soId: string) {
    return this.invoicingService.createFromSO(user.orgId, user.sub, soId)
  }

  @Post('invoices/:id/send')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  sendInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicingService.sendInvoice(user.orgId, user.sub, id)
  }

  @Post('invoices/:id/void')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  voidInvoice(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('reason') reason?: string) {
    return this.invoicingService.voidInvoice(user.orgId, user.sub, id, reason)
  }

  @Post('invoices/:id/payments')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  recordPayment(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.invoicingService.recordPayment(user.orgId, user.sub, id, dto)
  }

  @Get('credit-memos')
  listCreditMemos(@CurrentUser() user: JwtPayload, @Query('customer_id') customerId?: string) {
    return this.invoicingService.listCreditMemos(user.orgId, customerId)
  }

  @Post('credit-memos')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createCreditMemo(@CurrentUser() user: JwtPayload, @Body() dto: CreateCreditMemoDto) {
    return this.invoicingService.createCreditMemo(user.orgId, user.sub, dto)
  }
}
