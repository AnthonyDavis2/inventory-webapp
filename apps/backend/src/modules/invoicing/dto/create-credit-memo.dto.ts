import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateCreditMemoDto {
  @IsOptional() @IsString() invoice_id?: string
  @IsString() customer_id!: string
  @IsNumber() @Min(1) amount_cents!: number
  @IsOptional() @IsString() reason?: string
}
