import { SetMetadata } from '@nestjs/common';

export const RBAC_PERMISSION_KEY = 'rbac_permission';

export const RequirePermission = (code: string) => SetMetadata(RBAC_PERMISSION_KEY, code);
