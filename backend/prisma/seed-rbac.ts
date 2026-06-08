import { rbacPrisma } from '../src/config/prisma';

async function main() {
  console.log('Seeding RBAC data...');

  // System roles
  const roles = await Promise.all([
    rbacPrisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      create: { code: 'SUPER_ADMIN', name: '슈퍼관리자', description: '모든 권한', isSystem: true },
      update: { name: '슈퍼관리자', isSystem: true },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: '관리자', description: '관리 권한', isSystem: true },
      update: { name: '관리자', isSystem: true },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'TEAM_LEADER' },
      create: { code: 'TEAM_LEADER', name: '팀장', description: '팀 관리 권한', isSystem: false },
      update: { name: '팀장' },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'VIEWER' },
      create: { code: 'VIEWER', name: '조회자', description: '읽기 전용', isSystem: false },
      update: { name: '조회자' },
    }),
  ]);

  const [superAdmin, admin, teamLeader, viewer] = roles;

  // Workschd page permissions
  const wsPages = [
    { code: 'workschd:page:admin-dashboard', name: '관리자 대시보드', type: 'PAGE', module: 'workschd', resource: '/workschd/admin/dashboard' },
    { code: 'workschd:page:admin-rbac', name: 'RBAC 권한관리', type: 'PAGE', module: 'workschd', resource: '/workschd/admin/rbac' },
    { code: 'workschd:page:team-manage', name: '팀 관리', type: 'PAGE', module: 'workschd', resource: '/workschd/team/manage' },
    { code: 'workschd:page:task-manage', name: '태스크 관리', type: 'PAGE', module: 'workschd', resource: '/workschd/task/manage' },
  ];

  // Workschd API permissions
  const wsApis = [
    { code: 'workschd:api:admin-config:read', name: '시스템 설정 조회', type: 'API', module: 'workschd', resource: 'GET:/workschd/admin/config' },
    { code: 'workschd:api:admin-config:write', name: '시스템 설정 수정', type: 'API', module: 'workschd', resource: 'PUT:/workschd/admin/config/:key' },
    { code: 'workschd:api:rbac:read', name: 'RBAC 조회', type: 'API', module: 'workschd', resource: 'GET:/rbac/*' },
    { code: 'workschd:api:rbac:write', name: 'RBAC 수정', type: 'API', module: 'workschd', resource: 'POST|PUT|DELETE:/rbac/*' },
    { code: 'workschd:api:statistics', name: '통계 조회', type: 'API', module: 'workschd', resource: 'GET:/workschd/statistics/*' },
  ];

  // Investand permissions
  const investandPerms = [
    { code: 'investand:page:admin-dashboard', name: 'Investand 관리 대시보드', type: 'PAGE', module: 'investand', resource: '/investand/admin' },
    { code: 'investand:api:dart:write', name: 'DART 데이터 수집', type: 'API', module: 'investand', resource: 'POST:/investand/admin/dart' },
    { code: 'investand:api:fear-greed:write', name: 'FearGreed 계산', type: 'API', module: 'investand', resource: 'POST:/investand/admin/calculate-index' },
  ];

  // Aipr permissions
  const aiprPerms = [
    { code: 'aipr:page:admin', name: 'Aipr 관리', type: 'PAGE', module: 'aipr', resource: '/aipr/admin' },
    { code: 'aipr:api:config:write', name: 'Aipr 설정 수정', type: 'API', module: 'aipr', resource: 'PUT:/api/aipr/admin/config/:key' },
    { code: 'aipr:api:issues:write', name: 'Aipr 이슈 수정', type: 'API', module: 'aipr', resource: 'PATCH:/api/aipr/admin/issues/:id' },
  ];

  // Aviation permissions
  const aviationPerms = [
    { code: 'aviation:page:admin', name: 'Aviation 관리', type: 'PAGE', module: 'aviation', resource: '/aviation/admin' },
    { code: 'aviation:api:knowledge:write', name: 'Aviation 지식 수정', type: 'API', module: 'aviation', resource: 'PUT:/aviation/knowledge/:day' },
  ];

  const allPerms = [...wsPages, ...wsApis, ...investandPerms, ...aiprPerms, ...aviationPerms];

  const permRecords = await Promise.all(
    allPerms.map((p) =>
      rbacPrisma.permission.upsert({
        where: { code: p.code },
        create: p,
        update: { name: p.name, resource: p.resource },
      }),
    ),
  );

  // SUPER_ADMIN gets all permissions
  const superAdminPerms = permRecords.map((p) => ({
    roleId: superAdmin.id,
    permissionId: p.id,
  }));

  await rbacPrisma.rolePermission.createMany({
    data: superAdminPerms,
    skipDuplicates: true,
  });

  // ADMIN gets workschd + RBAC permissions
  const adminPermCodes = [
    'workschd:page:admin-dashboard', 'workschd:page:admin-rbac',
    'workschd:page:team-manage', 'workschd:page:task-manage',
    'workschd:api:admin-config:read', 'workschd:api:admin-config:write',
    'workschd:api:rbac:read', 'workschd:api:rbac:write',
    'workschd:api:statistics',
  ];
  const adminPerms = permRecords.filter((p) => adminPermCodes.includes(p.code));
  await rbacPrisma.rolePermission.createMany({
    data: adminPerms.map((p) => ({ roleId: admin.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // TEAM_LEADER gets basic workschd pages
  const tlPermCodes = ['workschd:page:team-manage', 'workschd:page:task-manage', 'workschd:api:statistics'];
  const tlPerms = permRecords.filter((p) => tlPermCodes.includes(p.code));
  await rbacPrisma.rolePermission.createMany({
    data: tlPerms.map((p) => ({ roleId: teamLeader.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  console.log(`Created ${roles.length} roles and ${permRecords.length} permissions.`);
}

main()
  .catch(console.error)
  .finally(() => rbacPrisma.$disconnect());
