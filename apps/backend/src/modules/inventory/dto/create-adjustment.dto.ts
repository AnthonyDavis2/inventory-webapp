import {
  IsUUID,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AdjustmentLineDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiProperty()
  @IsUUID()
  warehouse_id!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bin_location_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lot_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serial_number_id?: string

  @ApiProperty({ description: 'Positive = add stock, negative = remove stock' })
  @IsNumber({ maxDecimalPlaces: 4 })
  quantity!: number

  @ApiProperty({ description: 'Unit cost in cents (BigInt stored as number)' })
  @IsNumber()
  unit_cost_cents!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class CreateAdjustmentDto {
  @ApiProperty({ enum: ['INVENTORY_ADJUSTMENT', 'OPENING_BALANCE', 'DAMAGED', 'EXPIRED'] })
  @IsEnum(['INVENTORY_ADJUSTMENT', 'OPENING_BALANCE', 'DAMAGED', 'EXPIRED'])
  movement_type!: string

  @ApiProperty({ type: [AdjustmentLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines!: AdjustmentLineDto[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
