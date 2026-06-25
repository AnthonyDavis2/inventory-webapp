import { IsUUID, IsNumber, IsPositive, IsDateString, IsOptional, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertPriceEntryDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiProperty({ description: 'Unit cost in cents' })
  @IsNumber()
  @IsPositive()
  unit_cost_cents!: number

  @ApiProperty({ description: 'UOM for this price (typically purchase UOM)' })
  @IsUUID()
  uom_id!: string

  @ApiPropertyOptional({ description: 'Minimum order quantity for this price', default: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  min_quantity?: number

  @ApiProperty()
  @IsDateString()
  effective_from!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_to?: string
}
