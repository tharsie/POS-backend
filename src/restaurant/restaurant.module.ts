import { Module } from '@nestjs/common';
import { RestaurantController } from './restaurant.controller';
import { KitchenStationsController } from './kitchen-stations.controller';
import { RestaurantService } from './restaurant.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [RestaurantController, KitchenStationsController],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
