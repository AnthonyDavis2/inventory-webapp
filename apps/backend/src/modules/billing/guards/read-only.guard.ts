import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common'
import { PrismaService } from '../../../core/database/prisma.service'

/**
 * Blocks state-mutating requests (non-GET/HEAD) when the org's subscription
 * has lapsed and is_read_only = true. Apply to any controller that writes data.
 */
@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const method: string = request.method

    // Read requests are always allowed
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true

    const user = request.user
    if (!user?.orgId) return true // Auth guard handles unauthenticated requests

    const org = await this.prisma.organization.findFirst({
      where: { id: user.orgId },
      select: { is_read_only: true },
    })

    if (org?.is_read_only) {
      throw new HttpException(
        'Your subscription has expired. Please update your billing details to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    return true
  }
}
