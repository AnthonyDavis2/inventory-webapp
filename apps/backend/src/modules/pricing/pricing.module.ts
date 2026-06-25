import { Module } from '@nestjs/common'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
