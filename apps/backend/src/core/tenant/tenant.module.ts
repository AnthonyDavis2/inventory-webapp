import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TenantMiddleware } from './tenant.middleware'

@Module({
  imports: [JwtModule.register({})],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*')
  }
}
