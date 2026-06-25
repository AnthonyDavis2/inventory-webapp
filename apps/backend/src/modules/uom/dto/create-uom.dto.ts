import { IsString, IsIn, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

const UOM_TYPES = ['EACH', 'WEIGHT', 'VOLUME', 'LENGTH', 'AREA', 'TIME', 'CUSTOM'] as const

export class CreateUomDto {
  @ApiProperty({ example: 'Fluid Ounce' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string

  @ApiProperty({ example: 'fl oz' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  abbreviation!: string

  @ApiProperty({ enum: UOM_TYPES })
  @IsIn(UOM_TYPES)
  type!: string
}
