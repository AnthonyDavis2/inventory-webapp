import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { CreateContactDto } from './dto/create-contact.dto'
import { CreateAddressDto } from './dto/create-address.dto'
import { CreateGroupDto } from './dto/create-group.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Customers')
@ApiBearerAuth()
@Controller()
@UseGuards(ReadOnlyGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ─── Groups ───────────────────────────────────────────────────────────────

  @Get('customer-groups')
  listGroups(@CurrentUser() user: JwtPayload) {
    return this.customersService.listGroups(user.orgId)
  }

  @Post('customer-groups')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createGroup(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.customersService.createGroup(user.orgId, dto)
  }

  @Patch('customer-groups/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateGroup(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateGroupDto) {
    return this.customersService.updateGroup(user.orgId, id, dto)
  }

  @Delete('customer-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deleteGroup(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.deleteGroup(user.orgId, id)
  }

  // ─── Customers ────────────────────────────────────────────────────────────

  @Get('customers')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('q') q?: string,
    @Query('group_id') groupId?: string,
    @Query('type') type?: string,
  ) {
    return this.customersService.list(user.orgId, q, groupId, type)
  }

  @Get('customers/:id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.getOne(user.orgId, id)
  }

  @Post('customers')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.orgId, user.sub, dto)
  }

  @Patch('customers/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.update(user.orgId, user.sub, id, dto)
  }

  @Delete('customers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.delete(user.orgId, user.sub, id)
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  @Post('customers/:id/contacts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  createContact(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateContactDto) {
    return this.customersService.createContact(user.orgId, id, dto)
  }

  @Delete('customers/:id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  deleteContact(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.customersService.deleteContact(user.orgId, id, contactId)
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  @Post('customers/:id/addresses')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  createAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateAddressDto) {
    return this.customersService.createAddress(user.orgId, id, dto)
  }

  @Delete('customers/:id/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_STAFF')
  deleteAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('addressId') addressId: string) {
    return this.customersService.deleteAddress(user.orgId, id, addressId)
  }
}
