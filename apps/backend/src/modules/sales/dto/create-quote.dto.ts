import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateQuoteLineDto {
  @IsString() product_id!: string
  @IsOptional() @IsString() description?: string
  @IsNumber() @Min(0.0001) quantity!: number
  @IsString() uom_id!: string
  @IsNumber() @Min(0) unit_price_cents!: number
  @IsOptional() @IsNumber() @Min(0) discount_pct?: number
  @IsOptional() @IsNumber() @Min(0) tax_pct?: number
  @IsOptional() sort_order?: number
}

export class CreateQuoteDto {
  @IsString() customer_id!: string
  @IsOptional() @IsDateString() expires_at?: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsString() internal_notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateQuoteLineDto) lines!: CreateQuoteLineDto[]
}
