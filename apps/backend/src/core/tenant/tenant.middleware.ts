import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.slice(7)
    try {
      const payload = this.jwt.verify<{ sub: string; orgId: string }>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      })
      // Set PostgreSQL session variable for RLS policies
      await this.prisma.setTenantContext(payload.orgId)
    } catch {
      // Invalid token is handled by JwtAuthGuard; middleware is permissive
    }

    next()
  }
}
