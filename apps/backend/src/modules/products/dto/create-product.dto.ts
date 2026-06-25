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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProductType } from '@prisma/client'

export class CreateProductDto {
  @ApiProperty({ example: 'BOLT-M6-10' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku!: string

  @ApiProperty({ example: 'M6 x 10mm Hex Bolt' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type!: ProductType

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string

  @ApiProperty({ description: 'UOM used when purchasing (e.g. case)' })
  @IsUUID()
  purchase_uom_id!: string

  @ApiProperty({ description: 'UOM used for stock quantities (e.g. each)' })
  @IsUUID()
  stocking_uom_id!: string

  @ApiProperty({ description: 'UOM used when selling (e.g. each)' })
  @IsUUID()
  sales_uom_id!: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_lot_tracked?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_serial_tracked?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  has_expiry?: boolean

  @ApiPropertyOptional({ description: 'Days before expiry to trigger alert' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  expiry_alert_days?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_purchasable?: boolean

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_sellable?: boolean

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_manufactured?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
