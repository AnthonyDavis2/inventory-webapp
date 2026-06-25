import { Module } from '@nestjs/common'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { ReadOnlyGuard } from './guards/read-only.guard'

@Module({
  controllers: [BillingController],
  providers: [BillingService, ReadOnlyGuard],
  exports: [BillingService, ReadOnlyGuard],
})
export class BillingModule {}
