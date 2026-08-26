import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Assigned Kitchen / Dispatch Station (e.g. Main Kitchen, Cafe Bar)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  kitchenStation?: string;

  @ApiPropertyOptional({ description: 'IP address or hostname of the thermal printer for this station' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  kotPrinterIp?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Assigned Kitchen / Dispatch Station (e.g. Main Kitchen, Cafe Bar)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  kitchenStation?: string;

  @ApiPropertyOptional({ description: 'IP address or hostname of the thermal printer for this station' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  kotPrinterIp?: string;
}
