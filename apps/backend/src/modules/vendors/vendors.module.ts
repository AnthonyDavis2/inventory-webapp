import { Module } from '@nestjs/common'
import { VendorsController } from './vendors.controller'
import { VendorsService } from './vendors.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
