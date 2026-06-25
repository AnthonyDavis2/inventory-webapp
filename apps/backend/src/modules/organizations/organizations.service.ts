import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import type { CostingMethod } from '@prisma/client'
import { PrismaService } from '../../core/database/prisma.service'
import { AuthService } from '../../core/auth/auth.service'
import { BillingService } from '../billing/billing.service'
import type { RegisterDto } from './dto/register.dto'
import type { UpdateOrgDto } from './dto/update-org.dto'
import type { OnboardingStepDto } from './dto/onboarding-step.dto'

const BCRYPT_ROUNDS = 12

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly billing: BillingService,
  ) {}

  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; orgId: string; userId: string }> {
    const slug = dto.slug ?? this.generateSlug(dto.orgName)

    const [slugTaken, emailTaken] = await Promise.all([
      this.prisma.organization.findUnique({ where: { slug } }),
      this.prisma.user.findFirst({ where: { email: dto.email } }),
    ])

    if (slugTaken) throw new ConflictException('Organization slug already taken')
    if (emailTaken) throw new ConflictException('Email already registered')

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.orgName,
          slug,
          email: dto.email,
        },
      })

      const user = await tx.user.create({
        data: {
          org_id: org.id,
          email: dto.email,
          name: dto.ownerName,
          password_hash: passwordHash,
          role: 'OWNER',
        },
      })

      await this.seedDefaultData(tx, org.id)

      return { org, user }
    })

    // Non-blocking: create Stripe customer + 14-day trial. Failures are logged, not thrown.
    await this.billing.onRegister(result.org.id, result.org.email, result.org.name)

    const tokens = await this.auth.createSession(
      result.user.id,
      result.org.id,
      result.user.email,
      result.user.role,
      ipAddress,
      userAgent,
    )

    return { ...tokens, orgId: result.org.id, userId: result.user.id }
  }

  async getOrg(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deleted_at: null },
      include: {
        subscription: {
          select: { plan: true, status: true, trial_ends_at: true, current_period_end: true },
        },
        tax_settings: true,
      },
    })
    if (!org) throw new NotFoundException('Organization not found')
    return org
  }

  async updateOrg(orgId: string, dto: UpdateOrgDto) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: dto,
    })
  }

  async advanceOnboarding(orgId: string, dto: OnboardingStepDto) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } })

    // Steps must be completed in order
    if (dto.step !== org.onboarding_step + 1 && org.onboarding_step !== 0) {
      throw new BadRequestException(
        `Expected step ${org.onboarding_step + 1}, got step ${dto.step}`,
      )
    }

    await this.prisma.$transaction(async (tx) => {
      // Apply step-specific data
      if (dto.step === 1) {
        await tx.organization.update({
          where: { id: orgId },
          data: {
            name: dto.name ?? org.name,
            address_line1: dto.address_line1,
            city: dto.city,
            state: dto.state,
            zip: dto.zip,
            timezone: dto.timezone ?? org.timezone,
            fiscal_year_start: dto.fiscal_year_start ?? org.fiscal_year_start,
          },
        })
      }

      if (dto.step === 2) {
        if (org.costing_locked) throw new BadRequestException('Costing method is already locked')
        if (!dto.costing_method) throw new BadRequestException('costing_method is required for step 2')
        await tx.organization.update({
          where: { id: orgId },
          data: { costing_method: dto.costing_method as CostingMethod },
        })
      }

      if (dto.step === 5) {
        await tx.taxSettings.upsert({
          where: { org_id: orgId },
          update: {
            collect_sales_tax: dto.collect_sales_tax ?? false,
            nexus_states: dto.nexus_states ?? [],
            default_tax_rate: dto.default_tax_rate ?? 0,
          },
          create: {
            org_id: orgId,
            collect_sales_tax: dto.collect_sales_tax ?? false,
            nexus_states: dto.nexus_states ?? [],
            default_tax_rate: dto.default_tax_rate ?? 0,
          },
        })
      }

      const isLastStep = dto.step === 7
      await tx.organization.update({
        where: { id: orgId },
        data: {
          onboarding_step: dto.step,
          onboarding_complete: isLastStep,
        },
      })
    })

    return this.getOrg(orgId)
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
    const suffix = Math.random().toString(36).slice(2, 6)
    return `${base}-${suffix}`
  }

  private async seedDefaultData(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    orgId: string,
  ) {
    // Document sequences
    const docTypes = [
      { type: 'PO', prefix: 'PO-' },
      { type: 'SO', prefix: 'SO-' },
      { type: 'QUOTE', prefix: 'QT-' },
      { type: 'INVOICE', prefix: 'INV-' },
      { type: 'WO', prefix: 'WO-' },
      { type: 'RMA', prefix: 'RMA-' },
      { type: 'RECEIPT', prefix: 'REC-' },
      { type: 'CREDIT_MEMO', prefix: 'CM-' },
    ]

    await tx.documentSequence.createMany({
      data: docTypes.map((d) => ({
        org_id: orgId,
        document_type: d.type,
        prefix: d.prefix,
        next_number: 1,
        zero_pad_length: 5,
      })),
    })

    // Tax settings (default off)
    await tx.taxSettings.create({
      data: { org_id: orgId, collect_sales_tax: false, nexus_states: [] },
    })

    // Default chart of accounts
    const accounts = [
      { code: '1000', name: 'Cash', type: 'ASSET', subtype: 'Current Asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subtype: 'Current Asset' },
      { code: '1200', name: 'Inventory', type: 'ASSET', subtype: 'Current Asset' },
      { code: '1500', name: 'Equipment', type: 'ASSET', subtype: 'Fixed Asset' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subtype: 'Current Liability' },
      { code: '2100', name: 'Accrued Liabilities', type: 'LIABILITY', subtype: 'Current Liability' },
      { code: '3000', name: "Owner's Equity", type: 'EQUITY', subtype: null },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subtype: null },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subtype: null },
      { code: '5000', name: 'Cost of Goods Sold', type: 'COGS', subtype: null },
      { code: '6000', name: 'Operating Expenses', type: 'EXPENSE', subtype: null },
      { code: '6100', name: 'Salaries & Wages', type: 'EXPENSE', subtype: null },
      { code: '6200', name: 'Rent', type: 'EXPENSE', subtype: null },
      { code: '6300', name: 'Utilities', type: 'EXPENSE', subtype: null },
      { code: '6400', name: 'Office Supplies', type: 'EXPENSE', subtype: null },
      { code: '6500', name: 'Marketing & Advertising', type: 'EXPENSE', subtype: null },
      { code: '6600', name: 'Shipping & Freight', type: 'EXPENSE', subtype: null },
    ] as const

    await tx.chartOfAccount.createMany({
      data: accounts.map((a) => ({
        org_id: orgId,
        code: a.code,
        name: a.name,
        type: a.type,
        subtype: a.subtype ?? undefined,
        is_system: ['1200', '2000', '4000', '5000'].includes(a.code),
      })),
    })

    // Default expense categories
    await tx.expenseCategory.createMany({
      data: [
        { org_id: orgId, name: 'Office Supplies', is_overhead: false },
        { org_id: orgId, name: 'Travel & Meals', is_overhead: false },
        { org_id: orgId, name: 'Utilities', is_overhead: true },
        { org_id: orgId, name: 'Rent', is_overhead: true },
        { org_id: orgId, name: 'Marketing & Advertising', is_overhead: false },
        { org_id: orgId, name: 'Shipping & Freight', is_overhead: false },
        { org_id: orgId, name: 'Professional Services', is_overhead: false },
        { org_id: orgId, name: 'Equipment & Maintenance', is_overhead: true },
        { org_id: orgId, name: 'Other', is_overhead: false },
      ],
    })
  }
}
