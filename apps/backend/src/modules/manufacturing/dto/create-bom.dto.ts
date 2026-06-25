import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateBOMLineDto {
  @IsString() component_id!: string
  @IsNumber() @Min(0.000001) quantity!: number
  @IsString() uom_id!: string
  @IsOptional() @IsNumber() @Min(0) scrap_pct?: number
  @IsOptional() @IsString() substitute_id?: string
  @IsOptional() @IsBoolean() is_phantom?: boolean
  @IsOptional() @IsString() notes?: string
  @IsOptional() sort_order?: number
}

export class CreateBOMDto {
  @IsString() product_id!: string
  @IsString() name!: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateBOMLineDto) lines!: CreateBOMLineDto[]
}
