import { Module } from '@nestjs/common'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'
import { InventoryLedgerService } from './inventory-ledger.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryLedgerService],
  exports: [InventoryService, InventoryLedgerService],
})
export class InventoryModule {}
