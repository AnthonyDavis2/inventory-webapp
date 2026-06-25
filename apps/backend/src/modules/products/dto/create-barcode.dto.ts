import { IsString, IsEnum, IsBoolean, IsOptional, IsUUID, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { BarcodeType } from '@prisma/client'

export class CreateBarcodeDto {
  @ApiProperty({ example: '012345678901' })
  @IsString()
  @MaxLength(100)
  barcode!: string

  @ApiProperty({ enum: BarcodeType })
  @IsEnum(BarcodeType)
  barcode_type!: BarcodeType

  @ApiPropertyOptional({ description: 'Associate with a specific variant' })
  @IsOptional()
  @IsUUID()
  variant_id?: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean
}
