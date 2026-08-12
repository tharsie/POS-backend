import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { PlatformAdminService } from './platform-admin.service';
import {
  CreateSubscriptionPlanDto,
  CreateSuperAdminDto,
  IdDto,
  PlatformListQueryDto,
  UpdateCountryConfigDto,
  UpdatePlatformUserDto,
  UpdateSubscriptionPlanDto,
} from './dto/platform-admin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../common/guards/platform-roles.guard';
import { RequirePlatformRoles } from '../common/decorators/platform-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';

@ApiTags('Platform Admin')
@Controller('platform')
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @Post('auth/create-super-admin')
  createInitialSuperAdmin(@Body() dto: CreateSuperAdminDto) {
    return this.platform.createInitialSuperAdmin(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('businesses')
  listBusinesses(@Query() query: PlatformListQueryDto) {
    return this.platform.listBusinesses(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('businesses/:id')
  getBusiness(@Param() params: IdDto) {
    return this.platform.getBusiness(params.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Post('businesses/:id/suspend')
  suspendBusiness(@CurrentUser() user: AccessTokenPayload, @Param() params: IdDto) {
    return this.platform.setBusinessActive(user.sub, params.id, false);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Post('businesses/:id/reactivate')
  reactivateBusiness(@CurrentUser() user: AccessTokenPayload, @Param() params: IdDto) {
    return this.platform.setBusinessActive(user.sub, params.id, true);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('users')
  listUsers(@Query() query: PlatformListQueryDto) {
    return this.platform.listUsers(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Patch('users/:id')
  updateUser(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdDto,
    @Body() dto: UpdatePlatformUserDto,
  ) {
    return this.platform.updateUser(user.sub, params.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('subscription-plans')
  listPlans() {
    return this.platform.listSubscriptionPlans();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Post('subscription-plans')
  createPlan(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSubscriptionPlanDto) {
    return this.platform.createSubscriptionPlan(user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Patch('subscription-plans/:id')
  updatePlan(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdDto,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.platform.updateSubscriptionPlan(user.sub, params.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('countries')
  listCountries() {
    return this.platform.listCountries();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN)
  @Patch('countries/:id')
  updateCountry(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdDto,
    @Body() dto: UpdateCountryConfigDto,
  ) {
    return this.platform.updateCountry(user.sub, params.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PlatformRolesGuard)
  @RequirePlatformRoles(PlatformRole.SUPER_ADMIN, PlatformRole.SUPPORT_ADMIN)
  @Get('audit-logs')
  listAuditLogs(@Query() query: PlatformListQueryDto) {
    return this.platform.listAuditLogs(query);
  }
}
