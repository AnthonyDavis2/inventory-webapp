import { Module } from '@nestjs/common'
import { PurchasingController } from './purchasing.controller'
import { PurchasingService } from './purchasing.service'
import { BillingModule } from '../billing/billing.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [BillingModule, InventoryModule],
  controllers: [PurchasingController],
  providers: [PurchasingService],
  exports: [PurchasingService],
})
export class PurchasingModule {}
