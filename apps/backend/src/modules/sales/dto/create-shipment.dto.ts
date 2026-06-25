import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateShipmentLineDto {
  @IsString() so_line_id!: string
  @IsNumber() @Min(0.0001) quantity!: number
  @IsOptional() @IsString() lot_id?: string
  @IsOptional() @IsString() serial_number_id?: string
  @IsOptional() @IsString() bin_location_id?: string
}

export class CreateShipmentDto {
  @IsString() warehouse_id!: string
  @IsOptional() @IsString() carrier?: string
  @IsOptional() @IsString() tracking_number?: string
  @IsOptional() @IsNumber() @Min(0) shipping_cost_cents?: number
  @IsOptional() @IsDateString() shipped_at?: string
  @IsOptional() @IsString() notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateShipmentLineDto) lines!: CreateShipmentLineDto[]
}
