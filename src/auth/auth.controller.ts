import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { SelectBranchDto, SelectBusinessDto } from './dto/session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../common/types/authenticated-request';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/register-business')
  registerBusiness(@Body() dto: RegisterBusinessDto, @Req() req: Request) {
    return this.auth.registerBusiness(dto, this.requestMeta(req));
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, this.requestMeta(req));
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, this.requestMeta(req));
  }

  @Post('auth/logout')
  logout(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.logout(dto.refreshToken, this.requestMeta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('auth/logout-all')
  logoutAll(@CurrentUser() user: AccessTokenPayload, @Req() req: Request) {
    return this.auth.logoutAll(user.sub, this.requestMeta(req));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.me(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me/businesses')
  businesses(@CurrentUser() user: AccessTokenPayload) {
    return this.auth.listBusinesses(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('session/select-business')
  selectBusiness(@CurrentUser() user: AccessTokenPayload, @Body() dto: SelectBusinessDto) {
    return this.auth.selectBusiness(user.sub, dto.businessId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('session/select-branch')
  selectBranch(@CurrentUser() user: AccessTokenPayload, @Body() dto: SelectBranchDto) {
    return this.auth.selectBranch(user, dto.branchId);
  }

  private requestMeta(req: Request) {
    return {
      ip: req.ip,
      userAgent: req.header('user-agent'),
    };
  }
}
