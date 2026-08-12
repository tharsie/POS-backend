import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: '1200.00' })
  @IsDecimal()
  sellingPrice: string;

  @ApiPropertyOptional({ example: '900.00' })
  @IsOptional()
  @IsDecimal()
  costPrice?: string;

  @ApiPropertyOptional({ example: '18.00' })
  @IsOptional()
  @IsDecimal()
  taxRate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
