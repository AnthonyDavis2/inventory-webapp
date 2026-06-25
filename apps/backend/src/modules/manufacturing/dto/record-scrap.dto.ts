import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator'
import { ScrapDisposition } from '@prisma/client'

export class RecordScrapDto {
  @IsNumber() @Min(0.0001) quantity!: number
  @IsString() reason_code!: string
  @IsEnum(ScrapDisposition) disposition!: ScrapDisposition
  @IsOptional() @IsString() notes?: string
}
