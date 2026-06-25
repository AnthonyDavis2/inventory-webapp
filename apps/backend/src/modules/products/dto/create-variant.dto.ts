import { IsString, IsObject, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateVariantDto {
  @ApiProperty({ example: 'BOLT-M6-10-RED-L' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku!: string

  @ApiProperty({ example: 'M6 x 10mm Hex Bolt — Red / Large' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string

  @ApiProperty({ example: { color: 'Red', size: 'L' } })
  @IsObject()
  attributes!: Record<string, string>
}
