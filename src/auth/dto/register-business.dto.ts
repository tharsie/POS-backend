import { ApiProperty } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterBusinessDto {
  @ApiProperty()
  @IsString()
  ownerName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @MinLength(10)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'password must contain uppercase, lowercase and number characters',
  })
  password: string;

  @ApiProperty()
  @IsString()
  businessName: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiProperty({ example: 'LK' })
  @Matches(/^[A-Z]{2}$/)
  countryCode: string;

  @ApiProperty()
  @IsString()
  branchName: string;

  @ApiProperty()
  @Matches(/^[A-Z0-9_-]{2,20}$/)
  branchCode: string;
}
