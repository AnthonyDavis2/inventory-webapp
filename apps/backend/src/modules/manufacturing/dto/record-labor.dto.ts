import { IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator'

export class RecordLaborDto {
  @IsNumber() @Min(0.01) hours!: number
  @IsNumber() @Min(0) rate_cents!: number
  @IsDateString() recorded_at!: string
  @IsOptional() @IsString() notes?: string
}
