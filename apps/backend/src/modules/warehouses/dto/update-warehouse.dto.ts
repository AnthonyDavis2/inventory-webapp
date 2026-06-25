import { IsString, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string

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
