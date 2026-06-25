import {
  Controller, Get, Post, Delete, Body, Param, Query, Res,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AccountingService, CreateAccountDto, CreateJournalEntryDto } from './accounting.service'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('accounts')
  listAccounts(@CurrentUser() user: JwtPayload) {
    return this.accountingService.listAccounts(user.orgId)
  }

  @Post('accounts')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createAccount(@CurrentUser() user: JwtPayload, @Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(user.orgId, dto)
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deleteAccount(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountingService.deleteAccount(user.orgId, id)
  }

  @Get('journal-entries')
  listJournalEntries(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.accountingService.listJournalEntries(user.orgId, from, to)
  }

  @Post('journal-entries')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createJournalEntry(@CurrentUser() user: JwtPayload, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(user.orgId, user.sub, dto)
  }

  @Post('journal-entries/:id/post')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  postJournalEntry(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accountingService.postJournalEntry(user.orgId, user.sub, id)
  }

  @Get('trial-balance')
  getTrialBalance(@CurrentUser() user: JwtPayload, @Query('as_of') asOf?: string) {
    return this.accountingService.getTrialBalance(user.orgId, asOf)
  }

  @Get('export/journal-entries')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  async exportJournalEntries(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.accountingService.exportToCsv(user.orgId, from, to)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="journal-entries.csv"')
    res.send(csv)
  }
}
