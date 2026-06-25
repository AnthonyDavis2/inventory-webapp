import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        org_id: orgId,
        user_id: userId,
        ...(unreadOnly && { is_read: false }),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })
  }

  async getUnreadCount(orgId: string, userId: string) {
    const count = await this.prisma.notification.count({ where: { org_id: orgId, user_id: userId, is_read: false } })
    return { count }
  }

  async markRead(orgId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, org_id: orgId, user_id: userId } })
    if (!notification) throw new NotFoundException('Notification not found')
    return this.prisma.notification.update({ where: { id }, data: { is_read: true, read_at: new Date() } })
  }

  async markAllRead(orgId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { org_id: orgId, user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    })
    return { success: true }
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { user_id: userId } })
  }

  async upsertPreference(userId: string, notificationType: string, inApp: boolean, email: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { user_id_notification_type: { user_id: userId, notification_type: notificationType as any } },
      create: { user_id: userId, notification_type: notificationType as any, in_app: inApp, email },
      update: { in_app: inApp, email },
    })
  }

  /** Create a notification for a user. Called internally by other services. */
  async create(orgId: string, userId: string, params: {
    type: string
    severity: string
    title: string
    body: string
    reference_type?: string
    reference_id?: string
  }) {
    const pref = await this.prisma.notificationPreference.findFirst({
      where: { user_id: userId, notification_type: params.type as any },
    })

    if (pref && !pref.in_app) return null

    return this.prisma.notification.create({
      data: {
        org_id: orgId,
        user_id: userId,
        type: params.type as any,
        severity: params.severity as any,
        title: params.title,
        body: params.body,
        reference_type: params.reference_type,
        reference_id: params.reference_id,
      },
    })
  }
}
