import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ServiceFeeTypeDto {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export class CreateOrderServiceDto {
  @ApiProperty({ example: 'Takeaway Charge' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'TAKEAWAY' })
  @IsString()
  code: string;

  @ApiProperty({ enum: ServiceFeeTypeDto, default: ServiceFeeTypeDto.FIXED })
  @IsEnum(ServiceFeeTypeDto)
  feeType: ServiceFeeTypeDto;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  feeValue: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrderServiceDto {
  @ApiPropertyOptional({ example: 'Takeaway Charge' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'TAKEAWAY' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: ServiceFeeTypeDto })
  @IsOptional()
  @IsEnum(ServiceFeeTypeDto)
  feeType?: ServiceFeeTypeDto;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
