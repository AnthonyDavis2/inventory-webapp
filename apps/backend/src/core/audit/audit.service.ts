import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import type { AuditAction } from '@prisma/client'

export interface AuditEntry {
  orgId: string
  userId?: string
  action: AuditAction
  entityType: string
  entityId: string
  beforeState?: object
  afterState?: object
  ipAddress?: string
  userAgent?: string
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        org_id: entry.orgId,
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        before_state: entry.beforeState ?? undefined,
        after_state: entry.afterState ?? undefined,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      },
    })
  }
}
