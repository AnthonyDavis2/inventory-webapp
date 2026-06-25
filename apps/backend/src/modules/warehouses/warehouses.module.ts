import { Module } from '@nestjs/common'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [BillingModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
