import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingFloat: number;

  @IsOptional()
  @IsString()
  openingNote?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
