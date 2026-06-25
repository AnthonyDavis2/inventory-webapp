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
import { UomService } from './uom.service'
import { CreateUomDto } from './dto/create-uom.dto'
import { UpdateUomDto } from './dto/update-uom.dto'
import { CreateConversionDto } from './dto/create-conversion.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Units of Measure')
@ApiBearerAuth()
@Controller('uom')
@UseGuards(ReadOnlyGuard)
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Get()
  @ApiOperation({ summary: 'List global UOM library + org custom UOMs' })
  listAll(@CurrentUser() user: JwtPayload) {
    return this.uomService.listAll(user.orgId)
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.uomService.getOne(user.orgId, id)
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a custom UOM for the organization' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUomDto) {
    return this.uomService.create(user.orgId, dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUomDto) {
    return this.uomService.update(user.orgId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.uomService.delete(user.orgId, id)
  }

  // Conversions

  @Get('conversions/list')
  @ApiOperation({ summary: 'List all UOM conversions for the organization' })
  listConversions(@CurrentUser() user: JwtPayload) {
    return this.uomService.listConversions(user.orgId)
  }

  @Post('conversions')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a UOM conversion (inverse is created automatically)' })
  createConversion(@CurrentUser() user: JwtPayload, @Body() dto: CreateConversionDto) {
    return this.uomService.createConversion(user.orgId, dto)
  }

  @Delete('conversions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a UOM conversion (inverse is removed automatically)' })
  deleteConversion(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.uomService.deleteConversion(user.orgId, id)
  }
}
