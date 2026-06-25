import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { PricingService } from './pricing.service'
import { CreatePriceListDto } from './dto/create-price-list.dto'
import { UpsertPriceEntryDto } from './dto/upsert-price-entry.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('price-lists')
@UseGuards(ReadOnlyGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.pricingService.listPriceLists(user.orgId)
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pricingService.getPriceList(user.orgId, id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePriceListDto) {
    return this.pricingService.createPriceList(user.orgId, dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreatePriceListDto) {
    return this.pricingService.updatePriceList(user.orgId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pricingService.deletePriceList(user.orgId, id)
  }

  @Post(':id/entries')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  upsertEntry(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpsertPriceEntryDto) {
    return this.pricingService.upsertEntry(user.orgId, id, dto)
  }

  @Delete(':id/entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteEntry(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('entryId') entryId: string) {
    return this.pricingService.deleteEntry(user.orgId, id, entryId)
  }
}
