import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMembersService } from './business-members.service';
import { UpdateStaffRoleDto } from './dto/staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('business/staff')
export class BusinessMembersController {
  constructor(private readonly staff: BusinessMembersService) {}

  @Get()
  @RequirePermissions('staff.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.staff.list(user);
  }

  @Patch(':id')
  @RequirePermissions('staff.update')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.staff.update(user, params.id, dto);
  }

  @Post(':id/suspend')
  @RequirePermissions('staff.suspend')
  suspend(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.staff.suspend(user, params.id);
  }
}
