import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsDateString, Min } from 'class-validator'
import { ExpenseRecurrence } from '@prisma/client'

export class CreateExpenseDto {
  @IsString() category_id!: string
  @IsString() description!: string
  @IsNumber() @Min(1) amount_cents!: number
  @IsDateString() expense_date!: string
  @IsOptional() @IsEnum(ExpenseRecurrence) recurrence?: ExpenseRecurrence
  @IsOptional() @IsBoolean() is_overhead?: boolean
  @IsOptional() @IsString() notes?: string
}
