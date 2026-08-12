import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { PLATFORM_ROLES_KEY } from '../decorators/platform-roles.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user?.platformRole || !required.includes(user.platformRole as PlatformRole)) {
      throw new ForbiddenException({
        code: 'PLATFORM_ROLE_FORBIDDEN',
        message: 'Platform administrator access required',
      });
    }
    return true;
  }
}
