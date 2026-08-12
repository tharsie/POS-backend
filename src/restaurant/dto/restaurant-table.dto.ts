import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRestaurantTableDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  code: string;

  @ApiPropertyOptional({ default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}

export class UpdateRestaurantTableDto extends PartialType(CreateRestaurantTableDto) {}
