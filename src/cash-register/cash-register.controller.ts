import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CashRegisterService } from './cash-register.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CashMovementDto } from './dto/cash-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';
import { IdParamDto } from '../common/dto/id-param.dto';

@ApiTags('Cash Register & Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegister: CashRegisterService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: AccessTokenPayload, @Query('branchId') branchId?: string) {
    return this.cashRegister.getCurrentShift(user, branchId);
  }

  @Post('open')
  open(@CurrentUser() user: AccessTokenPayload, @Body() dto: OpenShiftDto) {
    return this.cashRegister.openShift(user, dto);
  }

  @Post('movement')
  recordMovement(@CurrentUser() user: AccessTokenPayload, @Body() dto: CashMovementDto) {
    return this.cashRegister.recordMovement(user, dto);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: AccessTokenPayload, @Query('shiftId') shiftId?: string) {
    return this.cashRegister.getShiftSummary(user, shiftId);
  }

  @Post('close')
  close(@CurrentUser() user: AccessTokenPayload, @Body() dto: CloseShiftDto) {
    return this.cashRegister.closeShift(user, dto);
  }

  @Get('history')
  listHistory(
    @CurrentUser() user: AccessTokenPayload,
    @Query('branchId') branchId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.cashRegister.listShifts(user, { branchId, page, limit });
  }

  @Get(':id')
  getById(@CurrentUser() user: AccessTokenPayload, @Param() params: IdParamDto) {
    return this.cashRegister.getShiftById(user, params.id);
  }
}
