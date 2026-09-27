export * from './types';
export { workshdPermissions } from './workschd.permissions';
export { aiprPermissions } from './aipr.permissions';
export { aviationPermissions } from './aviation.permissions';
export { visionPermissions } from './vision.permissions';

import { workshdPermissions } from './workschd.permissions';
import { aiprPermissions } from './aipr.permissions';
import { aviationPermissions } from './aviation.permissions';
import { visionPermissions } from './vision.permissions';
import { PermissionDef } from './types';

export const ALL_PERMISSIONS: PermissionDef[] = [
  ...workshdPermissions,
  ...aiprPermissions,
  ...aviationPermissions,
  ...visionPermissions,
];
