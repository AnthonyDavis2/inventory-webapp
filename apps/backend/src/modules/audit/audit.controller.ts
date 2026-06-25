import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuditViewerService } from './audit.service'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles('OWNER', 'ADMIN')
export class AuditController {
  constructor(private readonly auditViewerService: AuditViewerService) {}

  @Get()
  query(
    @CurrentUser() user: JwtPayload,
    @Query('user_id') userId?: string,
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditViewerService.query(user.orgId, {
      userId,
      entityType,
      entityId,
      action,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('export')
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.auditViewerService.exportToCsv(user.orgId, from, to)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"')
    res.send(csv)
  }
}
