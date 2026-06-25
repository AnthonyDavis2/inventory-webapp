import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CostingService } from './costing.service'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Costing')
@ApiBearerAuth()
@Controller('costing')
export class CostingController {
  constructor(private readonly costingService: CostingService) {}

  @Get('overhead-rule')
  getOverheadRule(@CurrentUser() user: JwtPayload) {
    return this.costingService.getOverheadRule(user.orgId)
  }

  @Post('overhead-rule')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  upsertOverheadRule(
    @CurrentUser() user: JwtPayload,
    @Body() body: { method: string; pct_of_material?: number; per_unit_cents?: number; per_hour_cents?: number },
  ) {
    return this.costingService.upsertOverheadRule(user.orgId, body.method, body.pct_of_material, body.per_unit_cents, body.per_hour_cents)
  }

  @Post('products/:productId/standard-cost')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
  calcStandardCost(@CurrentUser() user: JwtPayload, @Param('productId') productId: string, @Body('bom_version_id') bomVersionId?: string) {
    return this.costingService.calcStandardCost(user.orgId, productId, bomVersionId)
  }

  @Get('products/:productId/cost-history')
  getProductCostHistory(@CurrentUser() user: JwtPayload, @Param('productId') productId: string) {
    return this.costingService.getProductCostHistory(user.orgId, productId)
  }

  @Get('margin-analysis')
  getMarginAnalysis(@CurrentUser() user: JwtPayload) {
    return this.costingService.getMarginAnalysis(user.orgId)
  }

  @Get('work-order-variance')
  getWOCostVariance(@CurrentUser() user: JwtPayload) {
    return this.costingService.getWOCostVariance(user.orgId)
  }
}
