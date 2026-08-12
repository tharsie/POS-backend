import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDecimal,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class PlatformListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 25;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdatePlatformUserDto {
  @ApiPropertyOptional({ enum: PlatformRole })
  @IsOptional()
  @IsEnum(PlatformRole)
  platformRole?: PlatformRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubscriptionPlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  code: string;

  @ApiProperty({ example: '5000.00' })
  @IsDecimal()
  monthlyPrice: string;

  @ApiProperty({ example: '54000.00' })
  @IsDecimal()
  yearlyPrice: string;

  @ApiProperty({ example: 'LKR' })
  @Matches(/^[A-Z]{3}$/)
  currencyCode: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  maximumBranches: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  maximumUsers: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  maximumRegisters: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  retailEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  restaurantEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  kotEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  kitchenDisplayEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  advancedReportsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  multiBranchEnabled?: boolean;
}

export class UpdateSubscriptionPlanDto extends PartialType(CreateSubscriptionPlanDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCountryConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numberFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  taxInclusivePricingDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class IdDto {
  @ApiProperty()
  @IsUUID()
  id: string;
}

export class CreateSuperAdminDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
