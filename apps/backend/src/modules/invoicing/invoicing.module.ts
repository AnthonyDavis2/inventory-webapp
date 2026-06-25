import { Module } from '@nestjs/common'
import { InvoicingController } from './invoicing.controller'
import { InvoicingService } from './invoicing.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService],
})
export class InvoicingModule {}
