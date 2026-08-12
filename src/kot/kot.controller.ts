import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KotService } from './kot.service';
import { CreateKotDto, UpdateKotStatusDto } from './dto/kot.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('KOT')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kot')
export class KotController {
  constructor(private readonly kot: KotService) {}

  @Get()
  @RequirePermissions('kot.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.kot.list(user);
  }

  @Post()
  @RequirePermissions('kot.create')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateKotDto) {
    return this.kot.create(user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('kot.update')
  updateStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateKotStatusDto,
  ) {
    return this.kot.updateStatus(user, params.id, dto);
  }
}
