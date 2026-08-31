import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualCash: number;

  @IsOptional()
  @IsString()
  closingNote?: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}
