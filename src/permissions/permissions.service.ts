import { Injectable } from '@nestjs/common';
import {
  BUSINESS_PERMISSIONS,
  PermissionCode,
  ROLE_PERMISSION_MAP,
} from '../common/constants/permissions';

@Injectable()
export class PermissionsService {
  getRolePermissions(role: string): readonly PermissionCode[] {
    return ROLE_PERMISSION_MAP[role] ?? [];
  }

  async roleHasPermissions(role: string, required: readonly PermissionCode[]) {
    const granted = new Set(this.getRolePermissions(role));
    return required.every((permission) => granted.has(permission));
  }

  allPermissions() {
    return BUSINESS_PERMISSIONS;
  }
}
