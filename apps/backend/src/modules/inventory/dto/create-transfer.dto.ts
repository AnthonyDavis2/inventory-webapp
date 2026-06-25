import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TransferLineDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bin_location_id_from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bin_location_id_to?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lot_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serial_number_id?: string

  @ApiProperty({ description: 'Quantity to transfer (must be positive)' })
  @IsNumber({ maxDecimalPlaces: 4 })
  quantity!: number
}

export class CreateTransferDto {
  @ApiProperty({ description: 'Source warehouse' })
  @IsUUID()
  from_warehouse_id!: string

  @ApiProperty({ description: 'Destination warehouse' })
  @IsUUID()
  to_warehouse_id!: string

  @ApiProperty({ type: [TransferLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines!: TransferLineDto[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
