import { IsString, IsOptional, IsBoolean, IsEnum, Length } from 'class-validator'
import { AddressType } from '@prisma/client'

export class CreateAddressDto {
  @IsEnum(AddressType) type!: AddressType
  @IsString() line1!: string
  @IsOptional() @IsString() line2?: string
  @IsString() city!: string
  @IsString() @Length(2, 2) state!: string
  @IsString() zip!: string
  @IsOptional() @IsBoolean() is_default?: boolean
}
