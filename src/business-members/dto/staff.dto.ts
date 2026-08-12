import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessRole } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateStaffRoleDto {
  @ApiProperty({ enum: BusinessRole })
  @IsEnum(BusinessRole)
  role: BusinessRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];
}
