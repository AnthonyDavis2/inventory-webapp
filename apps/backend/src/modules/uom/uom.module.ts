import { Module } from '@nestjs/common'
import { UomController } from './uom.controller'
import { UomService } from './uom.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [UomController],
  providers: [UomService],
  exports: [UomService],
})
export class UomModule {}
