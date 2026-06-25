import { IsUUID, IsNumber, IsOptional, IsInt, IsPositive, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertReorderRuleDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiProperty()
  @IsUUID()
  warehouse_id!: string

  @ApiProperty({ description: 'Trigger reorder when qty on hand falls below this' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  reorder_point!: number

  @ApiProperty({ description: 'How much to order when triggered' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  reorder_quantity!: number

  @ApiProperty({ description: 'Minimum buffer stock to maintain' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  safety_stock!: number

  @ApiProperty()
  @IsInt()
  @IsPositive()
  lead_time_days!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  preferred_vendor_id?: string
}
