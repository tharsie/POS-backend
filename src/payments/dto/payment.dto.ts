import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsDecimal, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReceivePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: '1200.00' })
  @IsDecimal()
  amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerReference?: string;
}
