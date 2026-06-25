import {
  IsUUID, IsEnum, IsOptional, IsDateString, IsString, IsArray,
  ValidateNested, IsNumber, IsPositive, ArrayMinSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentTerms } from '@prisma/client'

export class POLineDto {
  @ApiProperty()
  @IsUUID()
  product_id!: string

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantity_ordered!: number

  @ApiProperty()
  @IsUUID()
  uom_id!: string

  @ApiProperty({ description: 'Unit cost in cents' })
  @IsNumber()
  @IsPositive()
  unit_cost_cents!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expected_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class CreatePODto {
  @ApiProperty()
  @IsUUID()
  vendor_id!: string

  @ApiPropertyOptional({ enum: PaymentTerms })
  @IsOptional()
  @IsEnum(PaymentTerms)
  payment_terms?: PaymentTerms

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expected_date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internal_notes?: string

  @ApiProperty({ type: [POLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => POLineDto)
  lines!: POLineDto[]
}
