import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/business.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';

@ApiTags('Business')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('business')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Get()
  @RequirePermissions('business.view')
  getActive(@CurrentUser() user: AccessTokenPayload) {
    return this.businesses.getActive(user);
  }

  @Patch()
  @RequirePermissions('business.update')
  update(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateBusinessDto) {
    return this.businesses.updateActive(user, dto);
  }
}
