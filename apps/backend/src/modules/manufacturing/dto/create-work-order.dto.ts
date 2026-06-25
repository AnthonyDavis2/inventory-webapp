import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator'

export class CreateWorkOrderDto {
  @IsString() product_id!: string
  @IsString() bom_version_id!: string
  @IsString() warehouse_id!: string
  @IsNumber() @Min(0.0001) quantity_planned!: number
  @IsOptional() @IsDateString() scheduled_start?: string
  @IsOptional() @IsDateString() scheduled_end?: string
  @IsOptional() @IsString() notes?: string
}
