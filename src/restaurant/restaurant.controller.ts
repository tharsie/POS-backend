import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantTableDto, UpdateRestaurantTableDto } from './dto/restaurant-table.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Restaurant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('restaurant/tables')
export class RestaurantController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get()
  @RequirePermissions('table.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.restaurant.listTables(user);
  }

  @Post()
  @RequirePermissions('table.manage')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateRestaurantTableDto) {
    return this.restaurant.createTable(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('table.manage')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateRestaurantTableDto,
  ) {
    return this.restaurant.updateTable(user, params.id, dto);
  }
}
