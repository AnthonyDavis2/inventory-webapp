import { IsNumber, IsEnum, IsOptional, IsString, IsDateString, Min } from 'class-validator'
import { PaymentMethod } from '@prisma/client'

export class RecordPaymentDto {
  @IsNumber() @Min(1) amount_cents!: number
  @IsEnum(PaymentMethod) method!: PaymentMethod
  @IsOptional() @IsString() reference?: string
  @IsDateString() paid_at!: string
  @IsOptional() @IsString() notes?: string
}
