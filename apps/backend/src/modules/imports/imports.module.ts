import { Module } from '@nestjs/common'
import { ImportsController } from './imports.controller'
import { ImportsService } from './imports.service'
import { BillingModule } from '../billing/billing.module'
import { StorageModule } from '../../core/storage/storage.module'

@Module({
  imports: [BillingModule, StorageModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
