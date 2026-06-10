export interface PermissionDef {
  code: string;
  name: string;
  type: 'PAGE' | 'API';
  module: string;
  resource: string;
  description?: string;
  /** RBAC role codes that receive this permission on first sync */
  defaultRoles?: string[];
}
