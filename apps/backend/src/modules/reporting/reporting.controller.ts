import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReportingService } from './reporting.service'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard/executive')
  getExecutiveDashboard(@CurrentUser() user: JwtPayload, @Query('from') from: string, @Query('to') to: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const toDate = to ? new Date(to) : new Date()
    return this.reportingService.getExecutiveDashboard(user.orgId, fromDate, toDate)
  }

  @Get('dashboard/inventory')
  getInventoryDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportingService.getInventoryDashboard(user.orgId)
  }

  @Get('dashboard/sales')
  getSalesDashboard(@CurrentUser() user: JwtPayload, @Query('from') from: string, @Query('to') to: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const toDate = to ? new Date(to) : new Date()
    return this.reportingService.getSalesDashboard(user.orgId, fromDate, toDate)
  }

  @Get('dashboard/purchasing')
  getPurchasingDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportingService.getPurchasingDashboard(user.orgId)
  }

  @Get('dashboard/manufacturing')
  getManufacturingDashboard(@CurrentUser() user: JwtPayload, @Query('from') from: string, @Query('to') to: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const toDate = to ? new Date(to) : new Date()
    return this.reportingService.getManufacturingDashboard(user.orgId, fromDate, toDate)
  }

  @Get('inventory-movement')
  getInventoryMovement(@CurrentUser() user: JwtPayload, @Query('from') from: string, @Query('to') to: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = to ? new Date(to) : new Date()
    return this.reportingService.getInventoryMovementReport(user.orgId, fromDate, toDate)
  }

  @Get('customer-profitability')
  getCustomerProfitability(@CurrentUser() user: JwtPayload, @Query('from') from: string, @Query('to') to: string) {
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
    const toDate = to ? new Date(to) : new Date()
    return this.reportingService.getCustomerProfitabilityReport(user.orgId, fromDate, toDate)
  }

  @Get('export/inventory-valuation')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  async exportInventoryValuation(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.reportingService.exportInventoryValuationCsv(user.orgId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-valuation.csv"')
    res.send(csv)
  }

  @Get('export/aged-receivables')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async exportAgedReceivables(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.reportingService.exportAgedReceivablesCsv(user.orgId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="aged-receivables.csv"')
    res.send(csv)
  }
}
