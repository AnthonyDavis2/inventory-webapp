import { Module } from '@nestjs/common'
import { SalesController } from './sales.controller'
import { SalesService } from './sales.service'
import { BillingModule } from '../billing/billing.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [BillingModule, InventoryModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
