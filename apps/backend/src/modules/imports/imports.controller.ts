import { Controller, Get, Post, Body, Param, Query, Res, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ImportsService } from './imports.service'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
@UseGuards(ReadOnlyGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Get()
  listBatches(@CurrentUser() user: JwtPayload) {
    return this.importsService.listBatches(user.orgId)
  }

  @Get('templates/:entityType')
  getTemplate(@Param('entityType') entityType: string, @Res() res: Response) {
    const csv = this.importsService.getTemplate(entityType)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${entityType.toLowerCase()}-template.csv"`)
    res.send(csv)
  }

  @Get(':id')
  getBatch(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.importsService.getBatch(user.orgId, id)
  }

  @Post('initiate')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  initiateImport(@CurrentUser() user: JwtPayload, @Body() body: { entity_type: string; filename: string }) {
    return this.importsService.initiateImport(user.orgId, user.sub, body.entity_type, body.filename)
  }

  @Post(':id/confirm-upload')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  confirmUpload(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.importsService.confirmUpload(user.orgId, id)
  }

  @Post(':id/confirm-import')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  confirmImport(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.importsService.confirmImport(user.orgId, id)
  }

  @Post(':id/rollback')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  rollback(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.importsService.rollback(user.orgId, id, user.sub)
  }
}
