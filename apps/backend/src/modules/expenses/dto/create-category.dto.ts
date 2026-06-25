import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class CreateExpenseCategoryDto {
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() account_id?: string
  @IsOptional() @IsBoolean() is_overhead?: boolean
}
