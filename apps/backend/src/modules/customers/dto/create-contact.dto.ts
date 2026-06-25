import { IsString, IsOptional, IsBoolean, IsEmail } from 'class-validator'

export class CreateContactDto {
  @IsString() name!: string
  @IsOptional() @IsString() role?: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsBoolean() is_primary?: boolean
}
