import { PermissionDef } from './types';

const pages: PermissionDef[] = [
  {
    code: 'investand:page:admin-dashboard',
    name: 'Investand 관리 대시보드',
    type: 'PAGE',
    module: 'investand',
    resource: '/investand/admin/dashboard',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:page:admin-dart',
    name: 'DART 관리',
    type: 'PAGE',
    module: 'investand',
    resource: '/investand/admin/dart',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:page:admin-fear-greed',
    name: 'Fear & Greed 관리',
    type: 'PAGE',
    module: 'investand',
    resource: '/investand/admin/fear-greed',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const adminApis: PermissionDef[] = [
  {
    code: 'investand:api:admin:read',
    name: 'Investand 관리 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/admin/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:admin:write',
    name: 'Investand 관리 실행',
    type: 'API',
    module: 'investand',
    resource: 'POST|PUT:/investand/admin/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const dartApis: PermissionDef[] = [
  {
    code: 'investand:api:dart:read',
    name: 'DART 데이터 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/dart/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:dart:write',
    name: 'DART 데이터 수집·배치',
    type: 'API',
    module: 'investand',
    resource: 'POST:/investand/dart/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const fearGreedApis: PermissionDef[] = [
  {
    code: 'investand:api:fear-greed:read',
    name: 'Fear & Greed 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/fear-greed/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:fear-greed:write',
    name: 'Fear & Greed 계산·수정',
    type: 'API',
    module: 'investand',
    resource: 'POST:/investand/fear-greed/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

const marketApis: PermissionDef[] = [
  {
    code: 'investand:api:market:read',
    name: '시장 데이터 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/market/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:sector:read',
    name: '섹터 데이터 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/sectors/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:sector:write',
    name: '섹터 데이터 수집',
    type: 'API',
    module: 'investand',
    resource: 'POST:/investand/sectors/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:asset:read',
    name: '자산 데이터 조회',
    type: 'API',
    module: 'investand',
    resource: 'GET:/investand/assets/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'investand:api:asset:write',
    name: '자산 데이터 수집',
    type: 'API',
    module: 'investand',
    resource: 'POST:/investand/assets/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export const investandPermissions: PermissionDef[] = [
  ...pages,
  ...adminApis,
  ...dartApis,
  ...fearGreedApis,
  ...marketApis,
];
