import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'Acme Manufacturing' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  orgName!: string

  @ApiPropertyOptional({
    example: 'acme-mfg',
    description: 'URL-safe slug. Auto-generated from orgName if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens only' })
  @MaxLength(60)
  slug?: string

  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  ownerName!: string

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string
}
