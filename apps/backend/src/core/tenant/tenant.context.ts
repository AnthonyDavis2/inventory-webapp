import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface TenantContext {
  orgId: string
  userId: string
  role: string
}

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest()
    return {
      orgId: request.user.orgId,
      userId: request.user.sub,
      role: request.user.role,
    }
  },
)
