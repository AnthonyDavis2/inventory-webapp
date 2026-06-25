import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VendorsService } from './vendors.service'
import { CreateVendorDto } from './dto/create-vendor.dto'
import { CreateContactDto } from './dto/create-contact.dto'
import { UpsertPriceEntryDto } from './dto/upsert-price-entry.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
@UseGuards(ReadOnlyGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('q') q?: string) {
    return this.vendorsService.list(user.orgId, q)
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.vendorsService.getOne(user.orgId, id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(user.orgId, user.sub, dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateVendorDto) {
    return this.vendorsService.update(user.orgId, user.sub, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.vendorsService.delete(user.orgId, user.sub, id)
  }

  @Post(':id/contacts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createContact(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateContactDto) {
    return this.vendorsService.createContact(user.orgId, id, dto)
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteContact(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.vendorsService.deleteContact(user.orgId, id, contactId)
  }

  @Post(':id/prices')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a vendor price list entry for a product' })
  upsertPriceEntry(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpsertPriceEntryDto) {
    return this.vendorsService.upsertPriceEntry(user.orgId, id, dto)
  }

  @Delete(':id/prices/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deletePriceEntry(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('entryId') entryId: string) {
    return this.vendorsService.deletePriceEntry(user.orgId, id, entryId)
  }
}
