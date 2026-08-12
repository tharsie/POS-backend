import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateOrderServiceDto, UpdateOrderServiceDto } from './dto/service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Order Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @RequirePermissions('order.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.services.listServices(user);
  }

  @Post()
  @RequirePermissions('order.create')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateOrderServiceDto) {
    return this.services.createService(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('order.create')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateOrderServiceDto,
  ) {
    return this.services.updateService(user, params.id, dto);
  }

  @Delete(':id')
  @RequirePermissions('order.create')
  remove(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.services.deleteService(user, params.id);
  }
}
