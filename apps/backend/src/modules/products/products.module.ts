import { Module } from '@nestjs/common'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'
import { BillingModule } from '../billing/billing.module'
import { StorageModule } from '../../core/storage/storage.module'

@Module({
  imports: [BillingModule, StorageModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
