import { PermissionDef } from './types';

const pages: PermissionDef[] = [
  {
    code: 'aipr:page:issues',
    name: 'Aipr 이슈 관리',
    type: 'PAGE',
    module: 'aipr',
    resource: '/aipr/issues',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:page:settings',
    name: 'Aipr 설정',
    type: 'PAGE',
    module: 'aipr',
    resource: '/aipr/settings',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:page:providers',
    name: 'Aipr Git 제공자 관리',
    type: 'PAGE',
    module: 'aipr',
    resource: '/aipr/providers',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:page:repos',
    name: 'Aipr 저장소 관리',
    type: 'PAGE',
    module: 'aipr',
    resource: '/aipr/repos',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const adminApis: PermissionDef[] = [
  {
    code: 'aipr:api:admin:read',
    name: 'Aipr 이슈 조회',
    type: 'API',
    module: 'aipr',
    resource: 'GET:/api/aipr/admin/issues*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:admin:update',
    name: 'Aipr 이슈 수정',
    type: 'API',
    module: 'aipr',
    resource: 'PATCH:/api/aipr/admin/issues/:id',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:admin:write',
    name: 'Aipr Origin 관리',
    type: 'API',
    module: 'aipr',
    resource: 'POST:/api/aipr/admin/origins',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const configApis: PermissionDef[] = [
  {
    code: 'aipr:api:config:read',
    name: 'Aipr 설정 조회',
    type: 'API',
    module: 'aipr',
    resource: 'GET:/api/aipr/admin/config*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:config:write',
    name: 'Aipr 설정 수정',
    type: 'API',
    module: 'aipr',
    resource: 'PUT|DELETE:/api/aipr/admin/config/:key',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const providerApis: PermissionDef[] = [
  {
    code: 'aipr:api:provider:read',
    name: 'Git 제공자 조회',
    type: 'API',
    module: 'aipr',
    resource: 'GET:/api/aipr/admin/providers*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:provider:write',
    name: 'Git 제공자 관리',
    type: 'API',
    module: 'aipr',
    resource: 'POST|PATCH|DELETE:/api/aipr/admin/providers*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:repo:read',
    name: '저장소 목록 조회',
    type: 'API',
    module: 'aipr',
    resource: 'GET:/api/aipr/admin/providers/:id/repos',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aipr:api:repo:write',
    name: '저장소 동기화·이슈 가져오기',
    type: 'API',
    module: 'aipr',
    resource: 'POST:/api/aipr/admin/providers/:id/repos/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export const aiprPermissions: PermissionDef[] = [
  ...pages,
  ...adminApis,
  ...configApis,
  ...providerApis,
];
