import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

const ASSIGNABLE_ROLES = [
  'ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'PURCHASING_STAFF',
  'WAREHOUSE_STAFF',
  'PRODUCTION_STAFF',
  'SALES_STAFF',
  'VIEWER',
] as const

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @ApiPropertyOptional({ enum: ASSIGNABLE_ROLES })
  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: string
}
