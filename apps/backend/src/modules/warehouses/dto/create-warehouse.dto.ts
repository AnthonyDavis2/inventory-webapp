import { IsString, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: 'WH-001', description: 'Short unique code for this warehouse' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Code must be uppercase alphanumeric with hyphens/underscores' })
  code!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bins_enabled?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_default?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_line1?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_line2?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string

  @ApiPropertyOptional({ example: 'TX' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  state?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string
}
