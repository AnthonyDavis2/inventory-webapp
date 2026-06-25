import { Module } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'
import { AuthModule } from '../../core/auth/auth.module'
import { BillingModule } from '../billing/billing.module'

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
