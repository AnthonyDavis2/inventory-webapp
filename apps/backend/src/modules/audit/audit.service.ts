import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'

@Injectable()
export class AuditViewerService {
  constructor(private readonly prisma: PrismaService) {}

  async query(orgId: string, params: {
    userId?: string
    entityType?: string
    entityId?: string
    action?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  }) {
    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, params.limit ?? 50)
    const skip = (page - 1) * limit

    const where = {
      org_id: orgId,
      ...(params.userId && { user_id: params.userId }),
      ...(params.entityType && { entity_type: params.entityType }),
      ...(params.entityId && { entity_id: params.entityId }),
      ...(params.action && { action: params.action as any }),
      ...(params.from || params.to) && {
        created_at: {
          ...(params.from && { gte: new Date(params.from) }),
          ...(params.to && { lte: new Date(params.to) }),
        },
      },
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  }

  async exportToCsv(orgId: string, from?: string, to?: string): Promise<string> {
    const result = await this.query(orgId, { from, to, limit: 10000 })
    const rows = ['Timestamp,User ID,Action,Entity Type,Entity ID,IP Address']
    for (const log of result.data) {
      rows.push([
        log.created_at.toISOString(),
        log.user_id ?? '',
        log.action,
        log.entity_type,
        log.entity_id,
        log.ip_address ?? '',
      ].join(','))
    }
    return rows.join('\n')
  }
}
