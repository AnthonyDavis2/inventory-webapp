import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { WarehousesService } from './warehouses.service'
import { CreateWarehouseDto } from './dto/create-warehouse.dto'
import { UpdateWarehouseDto } from './dto/update-warehouse.dto'
import { CreateBinDto } from './dto/create-bin.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(ReadOnlyGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.warehousesService.list(user.orgId)
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.warehousesService.getOne(user.orgId, id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a warehouse. First warehouse is automatically set as default.' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWarehouseDto) {
    return this.warehousesService.create(user.orgId, user.sub, dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(user.orgId, user.sub, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a warehouse. Cannot delete default or a warehouse with inventory history.' })
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.warehousesService.delete(user.orgId, user.sub, id)
  }

  // Bin Locations

  @Get(':warehouseId/bins')
  @ApiOperation({ summary: 'List bin locations for a warehouse' })
  listBins(@CurrentUser() user: JwtPayload, @Param('warehouseId') warehouseId: string) {
    return this.warehousesService.listBins(user.orgId, warehouseId)
  }

  @Post(':warehouseId/bins')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  createBin(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId') warehouseId: string,
    @Body() dto: CreateBinDto,
  ) {
    return this.warehousesService.createBin(user.orgId, warehouseId, dto)
  }

  @Patch(':warehouseId/bins/:binId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  updateBin(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId') warehouseId: string,
    @Param('binId') binId: string,
    @Body() dto: CreateBinDto,
  ) {
    return this.warehousesService.updateBin(user.orgId, warehouseId, binId, dto)
  }

  @Delete(':warehouseId/bins/:binId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  deleteBin(
    @CurrentUser() user: JwtPayload,
    @Param('warehouseId') warehouseId: string,
    @Param('binId') binId: string,
  ) {
    return this.warehousesService.deleteBin(user.orgId, warehouseId, binId)
  }
}
