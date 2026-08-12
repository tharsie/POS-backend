import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KotStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateKotDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateKotStatusDto {
  @ApiProperty({ enum: KotStatus })
  @IsEnum(KotStatus)
  status: KotStatus;
}
