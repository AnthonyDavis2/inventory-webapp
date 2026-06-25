import { Test } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../../core/database/prisma.service'

const ORG = 'org-uuid'
const USER = 'user-uuid'

const mockNotification = {
  id: 'notif-1', org_id: ORG, user_id: USER,
  title: 'Low Stock', body: 'Widget below reorder point',
  is_read: false, read_at: null,
  notification_type: 'INVENTORY_BELOW_REORDER', severity: 'WARNING',
  created_at: new Date(),
}

function buildMockPrisma() {
  return {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  }
}

describe('NotificationsService', () => {
  let service: NotificationsService
  let prisma: ReturnType<typeof buildMockPrisma>

  beforeEach(async () => {
    prisma = buildMockPrisma()

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(NotificationsService)
  })

  describe('getUnreadCount', () => {
    it('returns the count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3)
      const result = await service.getUnreadCount(ORG, USER)
      expect(result).toEqual({ count: 3 })
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ is_read: false }) }),
      )
    })
  })

  describe('markRead', () => {
    it('marks a notification as read', async () => {
      prisma.notification.findFirst.mockResolvedValue(mockNotification)
      prisma.notification.update.mockResolvedValue({ ...mockNotification, is_read: true, read_at: new Date() })
      await service.markRead(ORG, USER, 'notif-1')
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_read: true }) }),
      )
    })

    it('throws NotFoundException when notification not found or belongs to different user', async () => {
      prisma.notification.findFirst.mockResolvedValue(null)
      await expect(service.markRead(ORG, USER, 'ghost')).rejects.toThrow(NotFoundException)
    })
  })

  describe('markAllRead', () => {
    it('bulk-updates all unread for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 })
      const result = await service.markAllRead(ORG, USER)
      expect(result).toEqual({ success: true })
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ org_id: ORG, user_id: USER, is_read: false }),
        }),
      )
    })
  })

  describe('list', () => {
    it('returns all notifications for the user', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification])
      const result = await service.list(ORG, USER)
      expect(result).toHaveLength(1)
    })

    it('filters to unread only when unreadOnly=true', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      await service.list(ORG, USER, true)
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ is_read: false }) }),
      )
    })
  })
})
