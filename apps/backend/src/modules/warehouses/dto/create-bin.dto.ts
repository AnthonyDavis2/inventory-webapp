import { IsString, IsBoolean, IsOptional, MinLength, MaxLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBinDto {
  @ApiProperty({ example: 'A1-02-03', description: 'Aisle-Rack-Shelf style code' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Z0-9_\-\.]+$/, { message: 'Code must be uppercase alphanumeric with hyphens, underscores, or dots' })
  code!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean
}
