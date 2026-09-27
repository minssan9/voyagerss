import { PermissionDef } from './types';

const pages: PermissionDef[] = [
  {
    code: 'vision:page:home',
    name: 'Vision 구성',
    type: 'PAGE',
    module: 'vision',
    resource: '/vision',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:page:cam',
    name: 'Vision 카메라 테스트',
    type: 'PAGE',
    module: 'vision',
    resource: '/vision/cam',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:page:judge',
    name: 'Vision 판정 테스트',
    type: 'PAGE',
    module: 'vision',
    resource: '/vision/judge',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
];

const apis: PermissionDef[] = [
  {
    code: 'vision:api:config:read',
    name: 'Vision 설정 조회',
    type: 'API',
    module: 'vision',
    resource: 'GET:/api/vision/config',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:api:config:write',
    name: 'Vision 설정 수정',
    type: 'API',
    module: 'vision',
    resource: 'PUT:/api/vision/config',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:api:cam:read',
    name: 'Vision 카메라 조회',
    type: 'API',
    module: 'vision',
    resource: 'GET:/api/vision/cam/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:api:judge:read',
    name: 'Vision 판정 조회',
    type: 'API',
    module: 'vision',
    resource: 'GET:/api/vision/judge/*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'vision:api:judge:write',
    name: 'Vision 판정 실행',
    type: 'API',
    module: 'vision',
    resource: 'POST:/api/vision/judge/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export const visionPermissions: PermissionDef[] = [...pages, ...apis];
