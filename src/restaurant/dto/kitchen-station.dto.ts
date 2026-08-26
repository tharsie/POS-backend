import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateKitchenStationDto {
  @ApiProperty({ description: 'Name of the kitchen dispatch station (e.g. Main Kitchen, Cafe & Bar)' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'Unique code for the station (e.g. MAIN_KITCHEN, BAR_1)' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: 'IP address or hostname of the thermal printer (e.g. 192.168.1.100)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  printerIp?: string;

  @ApiPropertyOptional({ description: 'TCP Port for raw network printing (default 9100)', default: 9100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  printerPort?: number;

  @ApiPropertyOptional({ description: 'Overview and description of this kitchen station' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default station for unassigned categories', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateKitchenStationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  printerIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  printerPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
