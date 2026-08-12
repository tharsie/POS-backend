import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionCode } from '../constants/permissions';
import { PermissionsService } from '../../permissions/permissions.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user?.businessRole) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Business role required',
      });
    }
    const allowed = await this.permissions.roleHasPermissions(user.businessRole, required);
    if (!allowed) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'Permission denied' });
    }
    return true;
  }
}
