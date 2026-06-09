import { PermissionDef } from './types';

const knowledgeApis: PermissionDef[] = [
  {
    code: 'aviation:api:knowledge:read',
    name: '항공 지식 조회',
    type: 'API',
    module: 'aviation',
    resource: 'GET:/aviation/knowledge*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'aviation:api:knowledge:write',
    name: '항공 지식 수정',
    type: 'API',
    module: 'aviation',
    resource: 'POST|PUT:/aviation/knowledge*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aviation:api:abbrev:read',
    name: '항공 약자 조회',
    type: 'API',
    module: 'aviation',
    resource: 'GET:/aviation/abbreviations*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'aviation:api:abbrev:write',
    name: '항공 약자 관리',
    type: 'API',
    module: 'aviation',
    resource: 'POST:/aviation/abbreviations/broadcast',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'aviation:api:weather:read',
    name: '날씨 데이터 조회',
    type: 'API',
    module: 'aviation',
    resource: 'GET:/aviation/weather*',
    defaultRoles: ['ADMIN', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'aviation:api:weather:write',
    name: '날씨 데이터 수집·관리',
    type: 'API',
    module: 'aviation',
    resource: 'POST:/aviation/weather*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export const aviationPermissions: PermissionDef[] = [
  ...knowledgeApis,
];
