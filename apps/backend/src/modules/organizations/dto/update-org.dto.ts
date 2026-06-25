import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsInt,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateOrgDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string

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
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase abbreviation' })
  state?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string

  @ApiPropertyOptional({ example: 'America/Chicago' })
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiPropertyOptional({ example: 1, description: '1=Jan ... 12=Dec' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscal_year_start?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logo_url?: string
}
