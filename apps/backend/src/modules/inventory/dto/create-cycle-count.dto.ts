import { IsUUID, IsOptional, IsArray, ValidateNested, IsNumber, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CycleCountLineDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bin_location_id?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lot_id?: string

  @ApiProperty({ description: 'Physical count quantity' })
  @IsNumber({ maxDecimalPlaces: 4 })
  counted_quantity!: number
}

export class CreateCycleCountDto {
  @ApiProperty()
  @IsUUID()
  warehouse_id!: string

  @ApiProperty({ type: [CycleCountLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CycleCountLineDto)
  lines!: CycleCountLineDto[]

  @ApiPropertyOptional()
  @IsOptional()
  reference?: string
}
