import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CashMovementType } from '@prisma/client';

export class CashMovementDto {
  @IsNotEmpty()
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  shiftId?: string;
}
