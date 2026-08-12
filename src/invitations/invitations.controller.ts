import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { InvitationsService } from './invitations.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';

@ApiTags('Invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('staff.invite')
  @Post('business/staff/invite')
  invite(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: InviteStaffDto,
    @Req() req: Request,
  ) {
    return this.invitations.inviteStaff(user, dto, {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }

  @Post('invitations/:token/accept')
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(token, dto);
  }
}
