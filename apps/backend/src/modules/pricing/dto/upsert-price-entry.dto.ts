import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator'
import { PriceRuleType } from '@prisma/client'

export class UpsertPriceEntryDto {
  @IsString() product_id!: string
  @IsEnum(PriceRuleType) rule_type!: PriceRuleType
  @IsOptional() @IsNumber() flat_price_cents?: number
  @IsOptional() @IsNumber() @Min(0) markup_factor?: number
  @IsOptional() @IsNumber() @Min(0) discount_pct?: number
}
