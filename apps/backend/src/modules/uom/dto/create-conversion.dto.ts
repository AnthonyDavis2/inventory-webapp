import { IsUUID, IsNumber, IsPositive } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateConversionDto {
  @ApiProperty({ description: 'Source UOM id' })
  @IsUUID()
  from_uom_id!: string

  @ApiProperty({ description: 'Target UOM id' })
  @IsUUID()
  to_uom_id!: string

  @ApiProperty({ description: 'How many target units equal 1 source unit', example: 16 })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  conversion_factor!: number
}
