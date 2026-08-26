import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RestaurantService } from './restaurant.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto/kitchen-station.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Restaurant - Kitchen Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('restaurant/kitchen-stations')
export class KitchenStationsController {
  constructor(private readonly restaurant: RestaurantService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.restaurant.listKitchenStations(user);
  }

  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateKitchenStationDto) {
    return this.restaurant.createKitchenStation(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateKitchenStationDto,
  ) {
    return this.restaurant.updateKitchenStation(user, params.id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.restaurant.deleteKitchenStation(user, params.id);
  }
}
