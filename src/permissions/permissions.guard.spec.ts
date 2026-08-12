import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from './permissions.service';

describe('PermissionsGuard', () => {
  it('allows a role with the required permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['staff.invite']),
    } as unknown as Reflector;
    const service = {
      roleHasPermissions: jest.fn().mockResolvedValue(true),
    } as unknown as PermissionsService;
    const guard = new PermissionsGuard(reflector, service);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { businessRole: 'OWNER' } }) }),
    };
    await expect(guard.canActivate(context as any)).resolves.toBe(true);
  });

  it('denies a role without the required permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['staff.invite']),
    } as unknown as Reflector;
    const service = {
      roleHasPermissions: jest.fn().mockResolvedValue(false),
    } as unknown as PermissionsService;
    const guard = new PermissionsGuard(reflector, service);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { businessRole: 'CASHIER' } }) }),
    };
    await expect(guard.canActivate(context as any)).rejects.toMatchObject({ status: 403 });
  });
});
