import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator'

export class CreatePriceListDto {
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsBoolean() is_default?: boolean
  @IsOptional() @IsNumber() @Min(0) min_margin_pct?: number
}
