import { IsUUID, IsString, IsOptional, IsBoolean, IsDateString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateLotDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiProperty({ example: 'LOT-2024-001' })
  @IsString()
  @MaxLength(100)
  lot_number!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batch_number?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expires_at?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  manufactured_at?: string

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_quarantine?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
