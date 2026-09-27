import { SetMetadata } from '@nestjs/common';

export const RBAC_ADMIN_KEY = 'rbacAdmin';

/** Requires ADMIN or SUPER_ADMIN subject role when no @RequirePermission is set. */
export const RbacAdminAccess = () => SetMetadata(RBAC_ADMIN_KEY, true);
