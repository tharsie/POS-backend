import { PlatformRole } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const PLATFORM_ROLES_KEY = 'platformRoles';
export const RequirePlatformRoles = (...roles: PlatformRole[]) =>
  SetMetadata(PLATFORM_ROLES_KEY, roles);
