import { IsEmail, IsString, MinLength, IsOptional, Length } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string

  @ApiPropertyOptional({ description: '6-digit TOTP code, required if MFA is enabled' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totp?: string
}
