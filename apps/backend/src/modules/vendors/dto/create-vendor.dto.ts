import {
  IsString, IsOptional, IsEmail, IsEnum, IsInt, IsPositive, MaxLength, Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentTerms } from '@prisma/client'

export class CreateVendorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string

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

  @ApiPropertyOptional({ description: 'Tax ID (stored as-is for MVP)' })
  @IsOptional()
  @IsString()
  tax_id?: string

  @ApiPropertyOptional({ enum: PaymentTerms, default: 'NET30' })
  @IsOptional()
  @IsEnum(PaymentTerms)
  payment_terms?: PaymentTerms

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  lead_time_days?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
