import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockMovementDto } from './dto/stock-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('movements')
  @RequirePermissions('inventory.view')
  listMovements(@CurrentUser() user: AccessTokenPayload) {
    return this.inventory.listMovements(user);
  }

  @Post('adjustments')
  @RequirePermissions('inventory.adjust')
  createAdjustment(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateStockMovementDto) {
    return this.inventory.createMovement(user, dto);
  }

  @Get('products/:id/stock-on-hand')
  @RequirePermissions('inventory.view')
  stockOnHand(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.inventory.stockOnHand(user, params.id);
  }
}
