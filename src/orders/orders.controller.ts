import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions('order.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.orders.list(user);
  }

  @Get(':id')
  @RequirePermissions('order.view')
  get(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.orders.get(user, params.id);
  }

  @Post()
  @RequirePermissions('order.create')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Patch(':id')
  @Put(':id')
  @RequirePermissions('order.create')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.update(user, params.id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('order.cancel')
  cancel(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.orders.cancel(user, params.id);
  }
}
