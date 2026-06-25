import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { CreateExpenseCategoryDto } from './dto/create-category.dto'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import { ReadOnlyGuard } from '../billing/guards/read-only.guard'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller()
@UseGuards(ReadOnlyGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('expense-categories')
  listCategories(@CurrentUser() user: JwtPayload) {
    return this.expensesService.listCategories(user.orgId)
  }

  @Post('expense-categories')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(user.orgId, dto)
  }

  @Patch('expense-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  updateCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.updateCategory(user.orgId, id, dto)
  }

  @Delete('expense-categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  deleteCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.deleteCategory(user.orgId, id)
  }

  @Get('expenses')
  list(
    @CurrentUser() user: JwtPayload,
    @Query('category_id') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expensesService.list(user.orgId, categoryId, from, to)
  }

  @Get('expenses/:id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.getOne(user.orgId, id)
  }

  @Post('expenses')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.orgId, user.sub, dto)
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT')
  delete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.delete(user.orgId, id)
  }

  @Post('expenses/:id/attachment')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
  getUploadUrl(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body('filename') filename: string) {
    return this.expensesService.getUploadUrl(user.orgId, id, filename)
  }
}
