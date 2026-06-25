import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'

import { envSchema } from './core/config/env.schema'
import { DatabaseModule } from './core/database/database.module'
import { AuthModule } from './core/auth/auth.module'
import { TenantModule } from './core/tenant/tenant.module'
import { AuditModule } from './core/audit/audit.module'
import { QueueModule } from './core/queue/queue.module'
import { StorageModule } from './core/storage/storage.module'
import { MailModule } from './core/mail/mail.module'
import { PdfModule } from './core/pdf/pdf.module'
import { SearchModule } from './core/search/search.module'
import { HealthModule } from './core/health/health.module'

import { OrganizationsModule } from './modules/organizations/organizations.module'
import { UsersModule } from './modules/users/users.module'
import { BillingModule } from './modules/billing/billing.module'
import { UomModule } from './modules/uom/uom.module'
import { WarehousesModule } from './modules/warehouses/warehouses.module'
import { ProductsModule } from './modules/products/products.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { VendorsModule } from './modules/vendors/vendors.module'
import { PurchasingModule } from './modules/purchasing/purchasing.module'
import { CustomersModule } from './modules/customers/customers.module'
import { PricingModule } from './modules/pricing/pricing.module'
import { SalesModule } from './modules/sales/sales.module'
import { InvoicingModule } from './modules/invoicing/invoicing.module'
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module'
import { CostingModule } from './modules/costing/costing.module'
import { ExpensesModule } from './modules/expenses/expenses.module'
import { AccountingModule } from './modules/accounting/accounting.module'
import { ReportingModule } from './modules/reporting/reporting.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { ImportsModule } from './modules/imports/imports.module'
import { AuditViewerModule } from './modules/audit/audit.module'

@Module({
  imports: [
    // Config — must be first
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validationOptions: { abortEarly: true },
    }),

    // Logging
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({ context: 'HTTP' }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: { ignore: (req) => req.url === '/api/health' },
      },
    }),

    // Infrastructure
    EventEmitterModule.forRoot({ wildcard: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Core modules
    DatabaseModule,
    AuthModule,
    TenantModule,
    AuditModule,
    QueueModule,
    StorageModule,
    MailModule,
    PdfModule,
    SearchModule,
    HealthModule,

    // Feature modules
    OrganizationsModule,
    UsersModule,
    BillingModule,
    UomModule,
    WarehousesModule,
    ProductsModule,
    InventoryModule,
    VendorsModule,
    PurchasingModule,
    CustomersModule,
    PricingModule,
    SalesModule,
    InvoicingModule,
    ManufacturingModule,
    CostingModule,
    ExpensesModule,
    AccountingModule,
    ReportingModule,
    NotificationsModule,
    ImportsModule,
    AuditViewerModule,
  ],
})
export class AppModule {}
