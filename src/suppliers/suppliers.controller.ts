import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermissions('supplier.view')
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.suppliers.list(user);
  }

  @Post()
  @RequirePermissions('supplier.manage')
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('supplier.manage')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param() params: IdParamDto,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(user, params.id, dto);
  }
}
