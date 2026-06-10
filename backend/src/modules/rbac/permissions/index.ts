export * from './types';
export { workshdPermissions } from './workschd.permissions';
export { investandPermissions } from './investand.permissions';
export { aiprPermissions } from './aipr.permissions';
export { aviationPermissions } from './aviation.permissions';

import { workshdPermissions } from './workschd.permissions';
import { investandPermissions } from './investand.permissions';
import { aiprPermissions } from './aipr.permissions';
import { aviationPermissions } from './aviation.permissions';
import { PermissionDef } from './types';

export const ALL_PERMISSIONS: PermissionDef[] = [
  ...workshdPermissions,
  ...investandPermissions,
  ...aiprPermissions,
  ...aviationPermissions,
];
