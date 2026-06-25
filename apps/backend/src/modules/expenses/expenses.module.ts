import { Module } from '@nestjs/common'
import { ExpensesController } from './expenses.controller'
import { ExpensesService } from './expenses.service'
import { BillingModule } from '../billing/billing.module'
import { StorageModule } from '../../core/storage/storage.module'

@Module({
  imports: [BillingModule, StorageModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
