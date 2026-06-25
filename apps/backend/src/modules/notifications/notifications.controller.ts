import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('unread_only') unreadOnly?: string) {
    return this.notificationsService.list(user.orgId, user.sub, unreadOnly === 'true')
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.orgId, user.sub)
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.orgId, user.sub, id)
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.orgId, user.sub)
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getPreferences(user.sub)
  }

  @Post('preferences')
  upsertPreference(
    @CurrentUser() user: JwtPayload,
    @Body() body: { notification_type: string; in_app: boolean; email: boolean },
  ) {
    return this.notificationsService.upsertPreference(user.sub, body.notification_type, body.in_app, body.email)
  }
}
