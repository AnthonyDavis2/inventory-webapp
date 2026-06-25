import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsInt,
  IsPositive,
  MinLength,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { ProductType } from '@prisma/client'

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchase_uom_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stocking_uom_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sales_uom_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_lot_tracked?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_serial_tracked?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  has_expiry?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  expiry_alert_days?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_purchasable?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_sellable?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_manufactured?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
