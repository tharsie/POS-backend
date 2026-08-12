import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectBusinessDto {
  @ApiProperty()
  @IsUUID()
  businessId: string;
}

export class SelectBranchDto {
  @ApiProperty()
  @IsUUID()
  branchId: string;
}
