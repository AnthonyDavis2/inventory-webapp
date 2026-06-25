import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../core/database/prisma.service'
import { StorageService } from '../../core/storage/storage.service'
import type { CreateExpenseDto } from './dto/create-expense.dto'
import type { CreateExpenseCategoryDto } from './dto/create-category.dto'

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Categories ───────────────────────────────────────────────────────────

  async listCategories(orgId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { org_id: orgId, deleted_at: null },
      include: { _count: { select: { expenses: { where: { deleted_at: null } } } } },
      orderBy: { name: 'asc' },
    })
  }

  async createCategory(orgId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: { org_id: orgId, name: dto.name, description: dto.description, account_id: dto.account_id, is_overhead: dto.is_overhead ?? false },
    })
  }

  async updateCategory(orgId: string, id: string, dto: Partial<CreateExpenseCategoryDto>) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!cat) throw new NotFoundException('Expense category not found')
    return this.prisma.expenseCategory.update({ where: { id }, data: dto })
  }

  async deleteCategory(orgId: string, id: string) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!cat) throw new NotFoundException('Expense category not found')
    const hasExpenses = await this.prisma.expense.findFirst({ where: { category_id: id, deleted_at: null } })
    if (hasExpenses) throw new BadRequestException('Cannot delete a category with expenses assigned to it')
    await this.prisma.expenseCategory.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  // ─── Expenses ─────────────────────────────────────────────────────────────

  async list(orgId: string, categoryId?: string, from?: string, to?: string) {
    return this.prisma.expense.findMany({
      where: {
        org_id: orgId,
        deleted_at: null,
        ...(categoryId && { category_id: categoryId }),
        ...(from || to) && {
          expense_date: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        },
      },
      include: { category: { select: { id: true, name: true, is_overhead: true } } },
      orderBy: { expense_date: 'desc' },
    })
  }

  async getOne(orgId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, org_id: orgId, deleted_at: null },
      include: { category: true },
    })
    if (!expense) throw new NotFoundException('Expense not found')
    return expense
  }

  async create(orgId: string, userId: string, dto: CreateExpenseDto) {
    const category = await this.prisma.expenseCategory.findFirst({ where: { id: dto.category_id, org_id: orgId, deleted_at: null } })
    if (!category) throw new NotFoundException('Expense category not found')

    return this.prisma.expense.create({
      data: {
        org_id: orgId,
        category_id: dto.category_id,
        description: dto.description,
        amount_cents: BigInt(Math.round(dto.amount_cents)),
        expense_date: new Date(dto.expense_date),
        recurrence: dto.recurrence ?? 'ONE_TIME',
        is_overhead: dto.is_overhead ?? category.is_overhead,
        notes: dto.notes,
        created_by: userId,
      },
    })
  }

  async delete(orgId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id, org_id: orgId, deleted_at: null } })
    if (!expense) throw new NotFoundException('Expense not found')
    await this.prisma.expense.update({ where: { id }, data: { deleted_at: new Date() } })
  }

  /** Get a presigned URL to upload a receipt attachment for an expense. */
  async getUploadUrl(orgId: string, expenseId: string, filename: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, org_id: orgId, deleted_at: null } })
    if (!expense) throw new NotFoundException('Expense not found')

    const key = `orgs/${orgId}/expenses/${expenseId}/${Date.now()}-${filename}`
    const uploadUrl = await this.storage.getSignedUploadUrl(key, 'application/octet-stream', 3600)

    await this.prisma.expense.update({ where: { id: expenseId }, data: { attachment_key: key, attachment_name: filename } })

    return { upload_url: uploadUrl, key }
  }
}
