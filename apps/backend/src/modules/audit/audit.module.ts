import { Module } from '@nestjs/common'
import { AuditController } from './audit.controller'
import { AuditViewerService } from './audit.service'

@Module({
  controllers: [AuditController],
  providers: [AuditViewerService],
})
export class AuditViewerModule {}
