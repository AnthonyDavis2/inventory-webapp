import { Module } from '@nestjs/common'
import { ManufacturingController } from './manufacturing.controller'
import { ManufacturingService } from './manufacturing.service'
import { BillingModule } from '../billing/billing.module'
import { InventoryModule } from '../inventory/inventory.module'

@Module({
  imports: [BillingModule, InventoryModule],
  controllers: [ManufacturingController],
  providers: [ManufacturingService],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
