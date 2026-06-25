import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ReturnCondition, ReturnDisposition } from '@prisma/client'

export class CreateReturnLineDto {
  @IsString() so_line_id!: string
  @IsNumber() @Min(0.0001) quantity!: number
  @IsEnum(ReturnCondition) condition!: ReturnCondition
  @IsEnum(ReturnDisposition) disposition!: ReturnDisposition
  @IsOptional() @IsString() restock_warehouse_id?: string
  @IsOptional() @IsString() notes?: string
}

export class CreateRmaDto {
  @IsString() so_id!: string
  @IsOptional() @IsString() reason?: string
  @IsOptional() @IsString() notes?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateReturnLineDto) lines!: CreateReturnLineDto[]
}
