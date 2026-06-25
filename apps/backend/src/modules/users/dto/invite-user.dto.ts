import { IsEmail, IsString, IsIn, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

const INVITABLE_ROLES = [
  'ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'PURCHASING_STAFF',
  'WAREHOUSE_STAFF',
  'PRODUCTION_STAFF',
  'SALES_STAFF',
  'VIEWER',
] as const

export class InviteUserDto {
  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES)
  role!: string
}
