import { IsEnum, IsNumber, IsPositive, IsOptional, IsString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { LandedCostType } from '@prisma/client'

export class AddLandedCostDto {
  @ApiProperty({ enum: LandedCostType })
  @IsEnum(LandedCostType)
  type!: LandedCostType

  @ApiProperty({ description: 'Total landed cost amount in cents' })
  @IsNumber()
  @IsPositive()
  amount_cents!: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string
}
