import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsBoolean,
  IsIn,
  IsNumber,
  IsArray,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class OnboardingStepDto {
  @ApiProperty({ description: 'The step being completed (1–7)', minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  step!: number

  // Step 1: Company info
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address_line1?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  state?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscal_year_start?: number

  // Step 2: Costing method
  @ApiPropertyOptional({ enum: ['FIFO', 'WEIGHTED_AVERAGE'] })
  @IsOptional()
  @IsIn(['FIFO', 'WEIGHTED_AVERAGE'])
  costing_method?: 'FIFO' | 'WEIGHTED_AVERAGE'

  // Step 5: Tax settings
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collect_sales_tax?: boolean

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nexus_states?: string[]

  @ApiPropertyOptional({ description: 'e.g. 0.0825 for 8.25%' })
  @IsOptional()
  @IsNumber()
  default_tax_rate?: number
}
