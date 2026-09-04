import { PermissionDef } from './types';

// ── Pages ─────────────────────────────────────────────────────────────────────
const pages: PermissionDef[] = [
  {
    code: 'workschd:page:admin-dashboard',
    name: '관리자 대시보드',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/admin/dashboard',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:admin-rbac',
    name: 'RBAC 권한 관리',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/admin/rbac',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:team-manage',
    name: '팀 관리',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/team/manage',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:task-manage',
    name: '작업 관리',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/task/manage',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:task-manage-mobile',
    name: '모바일 작업 관리',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/task/manage-mobile',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:task-list-mobile',
    name: '모바일 작업 목록',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/task/list-mobile',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:page:funeral-board',
    name: '장례식장 현황판',
    type: 'PAGE',
    module: 'workschd',
    resource: '/workschd/funeral-board',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'VIEWER', 'SUPER_ADMIN'],
  },
];

// ── RBAC 관리 API ──────────────────────────────────────────────────────────────
const rbacApis: PermissionDef[] = [
  {
    code: 'workschd:api:rbac:read',
    name: 'RBAC 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/rbac/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:rbac:write',
    name: 'RBAC 수정',
    type: 'API',
    module: 'workschd',
    resource: 'POST|PUT|DELETE:/api/rbac/*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

// ── 시스템 설정 API ─────────────────────────────────────────────────────────────
const configApis: PermissionDef[] = [
  {
    code: 'workschd:api:config:read',
    name: '시스템 설정 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/workschd/admin/config',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:config:write',
    name: '시스템 설정 수정',
    type: 'API',
    module: 'workschd',
    resource: 'PUT|DELETE:/api/workschd/admin/config/:key',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

// ── 통계 API ───────────────────────────────────────────────────────────────────
const statisticsApis: PermissionDef[] = [
  {
    code: 'workschd:api:statistics:read',
    name: '통계 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/workschd/statistics/*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
];

// ── 팀 API ─────────────────────────────────────────────────────────────────────
const teamApis: PermissionDef[] = [
  {
    code: 'workschd:api:team:read',
    name: '팀 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/workschd/team*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:team:create',
    name: '팀 생성',
    type: 'API',
    module: 'workschd',
    resource: 'POST:/api/workschd/team',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:team:write',
    name: '팀 관리 (초대·승인)',
    type: 'API',
    module: 'workschd',
    resource: 'POST:/api/workschd/team/:teamId/*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
];

// ── 작업 API ───────────────────────────────────────────────────────────────────
const taskApis: PermissionDef[] = [
  {
    code: 'workschd:api:task:read',
    name: '작업 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/workschd/task*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'VIEWER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:task:create',
    name: '작업 생성',
    type: 'API',
    module: 'workschd',
    resource: 'POST:/api/workschd/task',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:task:write',
    name: '작업 수정·참여·체크인',
    type: 'API',
    module: 'workschd',
    resource: 'PUT|PATCH:/api/workschd/task/*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:task:delete',
    name: '작업 삭제',
    type: 'API',
    module: 'workschd',
    resource: 'DELETE:/api/workschd/task/:id',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

// ── 스크래퍼 API ───────────────────────────────────────────────────────────────
const scraperApis: PermissionDef[] = [
  {
    code: 'workschd:api:scraper:read',
    name: '스크래퍼 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/workschd/scraper*',
    defaultRoles: ['ADMIN', 'TEAM_LEADER', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:scraper:write',
    name: '스크래퍼 실행',
    type: 'API',
    module: 'workschd',
    resource: 'POST:/api/workschd/scrape*',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

// ── 피드백 API ─────────────────────────────────────────────────────────────────
const feedbackApis: PermissionDef[] = [
  {
    code: 'workschd:api:feedback:read',
    name: '피드백 관리 조회',
    type: 'API',
    module: 'workschd',
    resource: 'GET:/api/v2/feedback',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    code: 'workschd:api:feedback:write',
    name: '피드백 상태 수정',
    type: 'API',
    module: 'workschd',
    resource: 'PATCH:/api/v2/feedback/:id',
    defaultRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
];

export const workshdPermissions: PermissionDef[] = [
  ...pages,
  ...rbacApis,
  ...configApis,
  ...statisticsApis,
  ...teamApis,
  ...taskApis,
  ...scraperApis,
  ...feedbackApis,
];
