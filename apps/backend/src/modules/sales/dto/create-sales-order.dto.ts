import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsDateString, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { PaymentTerms } from '@prisma/client'

export class CreateSOLineDto {
  @IsString() product_id!: string
  @IsOptional() @IsString() description?: string
  @IsNumber() @Min(0.0001) quantity_ordered!: number
  @IsString() uom_id!: string
  @IsNumber() @Min(0) unit_price_cents!: number
  @IsOptional() @IsNumber() @Min(0) discount_pct?: number
  @IsOptional() @IsNumber() @Min(0) tax_pct?: number
  @IsOptional() sort_order?: number
}

export class CreateSalesOrderDto {
  @IsString() customer_id!: string
  @IsOptional() @IsString() quote_id?: string
  @IsOptional() @IsEnum(PaymentTerms) payment_terms?: PaymentTerms
  @IsOptional() @IsString() ship_to_address_id?: string
  @IsOptional() @IsDateString() requested_ship_date?: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsString() internal_notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateSOLineDto) lines!: CreateSOLineDto[]
}
