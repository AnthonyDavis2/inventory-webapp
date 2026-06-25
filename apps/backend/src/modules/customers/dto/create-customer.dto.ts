import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsDateString } from 'class-validator'
import { CustomerType, PaymentTerms } from '@prisma/client'

export class CreateCustomerDto {
  @IsString() name!: string
  @IsOptional() @IsString() code?: string
  @IsEnum(CustomerType) type!: CustomerType
  @IsOptional() @IsString() group_id?: string
  @IsOptional() @IsString() price_list_id?: string
  @IsOptional() @IsEnum(PaymentTerms) payment_terms?: PaymentTerms
  @IsOptional() @IsInt() @Min(0) credit_limit_cents?: number
  @IsOptional() @IsBoolean() tax_exempt?: boolean
  @IsOptional() @IsString() tax_exempt_number?: string
  @IsOptional() @IsDateString() tax_exempt_expires?: string
  @IsOptional() @IsString() notes?: string
}
