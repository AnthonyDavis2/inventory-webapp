import {
  IsUUID, IsDateString, IsOptional, IsString, IsArray,
  ValidateNested, IsNumber, IsPositive, ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ReceiptLineDto {
  @ApiProperty()
  @IsUUID()
  po_line_id!: string

  @ApiProperty({ description: 'Quantity actually received' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity_received!: number

  @ApiProperty({ description: 'Actual unit cost in cents (may differ from PO cost)' })
  @IsNumber()
  @IsPositive()
  unit_cost_cents!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bin_location_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lot_id?: string

  @ApiPropertyOptional({ type: [String], description: 'Serial number IDs for serial-tracked items' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  serial_number_ids?: string[]
}

export class CreateReceiptDto {
  @ApiProperty()
  @IsUUID()
  warehouse_id!: string

  @ApiProperty()
  @IsDateString()
  received_at!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({ type: [ReceiptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[]
}
