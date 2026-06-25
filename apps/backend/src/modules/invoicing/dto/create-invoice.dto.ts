import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsDateString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentTerms } from '@prisma/client'

export class CreateInvoiceLineDto {
  @IsOptional() @IsString() so_line_id?: string
  @IsOptional() @IsString() product_id?: string
  @IsString() description!: string
  @IsNumber() @Min(0.0001) quantity!: number
  @IsNumber() @Min(0) unit_price_cents!: number
  @IsOptional() @IsNumber() @Min(0) discount_pct?: number
  @IsOptional() @IsNumber() @Min(0) tax_pct?: number
  @IsOptional() sort_order?: number
}

export class CreateInvoiceDto {
  @IsString() customer_id!: string
  @IsOptional() @IsString() so_id?: string
  @IsOptional() @IsEnum(PaymentTerms) payment_terms?: PaymentTerms
  @IsOptional() @IsDateString() due_date?: string
  @IsOptional() @IsString() notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInvoiceLineDto) lines!: CreateInvoiceLineDto[]
}
