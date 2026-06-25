import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'

export interface CreateAccountDto {
  code: string
  name: string
  type: string
  subtype?: string
  parent_id?: string
}

export interface CreateJournalEntryDto {
  date: string
  description: string
  reference_type?: string
  reference_id?: string
  lines: Array<{ account_id: string; debit_cents: number; credit_cents: number; description?: string }>
}

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Chart of Accounts ────────────────────────────────────────────────────

  async listAccounts(orgId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { org_id: orgId, deleted_at: null },
      include: { parent: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    })
  }

  async createAccount(orgId: string, dto: CreateAccountDto) {
    const conflict = await this.prisma.chartOfAccount.findFirst({ where: { org_id: orgId, code: dto.code, deleted_at: null } })
    if (conflict) throw new BadRequestException(`Account code "${dto.code}" already exists`)

    return this.prisma.chartOfAccount.create({
      data: {
        org_id: orgId,
        code: dto.code,
        name: dto.name,
        type: dto.type as any,
        subtype: dto.subtype,
        parent_id: dto.parent_id,
      },
    })
  }

  async deleteAccount(orgId: string, id: string) {
    const account = await this.prisma.chartOfAccount.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!account) throw new NotFoundException('Account not found')
    if (account.is_system) throw new BadRequestException('System accounts cannot be deleted')

    const hasLines = await this.prisma.journalEntryLine.findFirst({ where: { account_id: id } })
    if (hasLines) throw new BadRequestException('Cannot delete an account with journal entries')

    await this.prisma.chartOfAccount.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  // ─── Journal Entries ──────────────────────────────────────────────────────

  async listJournalEntries(orgId: string, from?: string, to?: string) {
    return this.prisma.journalEntry.findMany({
      where: {
        org_id: orgId,
        ...(from || to) && {
          date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        },
      },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true } } },
        },
      },
      orderBy: { date: 'desc' },
    })
  }

  async createJournalEntry(orgId: string, userId: string, dto: CreateJournalEntryDto) {
    const totalDebits = dto.lines.reduce((sum, l) => sum + l.debit_cents, 0)
    const totalCredits = dto.lines.reduce((sum, l) => sum + l.credit_cents, 0)
    if (totalDebits !== totalCredits) {
      throw new BadRequestException(`Journal entry is not balanced: debits=${totalDebits}, credits=${totalCredits}`)
    }

    const entryNumber = await this.nextJournalNumber(orgId)

    return this.prisma.journalEntry.create({
      data: {
        org_id: orgId,
        entry_number: entryNumber,
        date: new Date(dto.date),
        description: dto.description,
        reference_type: dto.reference_type,
        reference_id: dto.reference_id,
        lines: {
          create: dto.lines.map((l) => ({
            account_id: l.account_id,
            debit_cents: BigInt(Math.round(l.debit_cents)),
            credit_cents: BigInt(Math.round(l.credit_cents)),
            description: l.description,
          })),
        },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    })
  }

  async postJournalEntry(orgId: string, userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id, org_id: orgId } })
    if (!entry) throw new NotFoundException('Journal entry not found')
    if (entry.posted_at) throw new BadRequestException('Journal entry is already posted')

    return this.prisma.journalEntry.update({
      where: { id },
      data: { posted_at: new Date(), posted_by: userId },
    })
  }

  /** Trial balance: sum of all posted debits and credits per account. */
  async getTrialBalance(orgId: string, asOf?: string) {
    const cutoff = asOf ? new Date(asOf) : new Date()

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        journal: { org_id: orgId, posted_at: { not: null, lte: cutoff } },
      },
      include: { account: { select: { id: true, code: true, name: true, type: true } } },
    })

    const balanceMap = new Map<string, { account: any; debits: bigint; credits: bigint }>()
    for (const line of lines) {
      const existing = balanceMap.get(line.account_id)
      if (existing) {
        existing.debits += line.debit_cents
        existing.credits += line.credit_cents
      } else {
        balanceMap.set(line.account_id, { account: line.account, debits: line.debit_cents, credits: line.credit_cents })
      }
    }

    return Array.from(balanceMap.values()).map((row) => ({
      account: row.account,
      debit_balance: row.debits,
      credit_balance: row.credits,
      net_balance: row.debits - row.credits,
    })).sort((a, b) => a.account.code.localeCompare(b.account.code))
  }

  /** Export all posted journal entries to CSV format. */
  async exportToCsv(orgId: string, from?: string, to?: string): Promise<string> {
    const entries = await this.listJournalEntries(orgId, from, to)
    const rows = ['Entry Number,Date,Description,Account Code,Account Name,Debit,Credit']

    for (const entry of entries) {
      if (!entry.posted_at) continue
      for (const line of entry.lines) {
        rows.push([
          entry.entry_number,
          entry.date.toISOString().split('T')[0],
          `"${entry.description}"`,
          line.account.code,
          `"${line.account.name}"`,
          (Number(line.debit_cents) / 100).toFixed(2),
          (Number(line.credit_cents) / 100).toFixed(2),
        ].join(','))
      }
    }

    return rows.join('\n')
  }

  private async nextJournalNumber(orgId: string): Promise<string> {
    const count = await this.prisma.journalEntry.count({ where: { org_id: orgId } })
    const year = new Date().getFullYear()
    return `JE-${year}-${String(count + 1).padStart(5, '0')}`
  }
}
