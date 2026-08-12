import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDecimal,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: '2.000' })
  @IsDecimal()
  quantity: string;

  @ApiPropertyOptional({ example: '1200.00' })
  @IsOptional()
  @IsDecimal()
  unitPrice?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  tableName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  serviceFee?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
