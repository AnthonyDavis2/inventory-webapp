import { IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyMfaDto {
  @ApiProperty({ description: '6-digit TOTP code to confirm before enabling MFA' })
  @IsString()
  @Length(6, 6)
  totp!: string
}
