import { rbacPrisma } from '../src/config/prisma';
import { ALL_PERMISSIONS } from '../src/modules/rbac/permissions';

async function main() {
  console.log('Seeding RBAC base roles…');

  // 1. Upsert system roles
  const roles = await Promise.all([
    rbacPrisma.role.upsert({
      where: { code: 'SUPER_ADMIN' },
      create: { code: 'SUPER_ADMIN', name: '슈퍼관리자', description: '모든 모듈 전체 권한', isSystem: true },
      update: { name: '슈퍼관리자', isSystem: true },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'ADMIN' },
      create: { code: 'ADMIN', name: '관리자', description: '각 모듈 관리 권한', isSystem: true },
      update: { name: '관리자', isSystem: true },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'TEAM_LEADER' },
      create: { code: 'TEAM_LEADER', name: '팀장', description: '팀·작업 관리 권한', isSystem: false },
      update: { name: '팀장' },
    }),
    rbacPrisma.role.upsert({
      where: { code: 'VIEWER' },
      create: { code: 'VIEWER', name: '조회자', description: '읽기 전용 권한', isSystem: false },
      update: { name: '조회자' },
    }),
  ]);

  console.log(`Upserted ${roles.length} roles.`);

  // 2. Upsert all permissions from manifest
  console.log(`Syncing ${ALL_PERMISSIONS.length} permissions from manifest…`);
  let permCreated = 0;
  let permUpdated = 0;

  for (const def of ALL_PERMISSIONS) {
    const existing = await rbacPrisma.permission.findUnique({ where: { code: def.code } });
    if (existing) {
      await rbacPrisma.permission.update({
        where: { code: def.code },
        data: { name: def.name, type: def.type, module: def.module, resource: def.resource },
      });
      permUpdated++;
    } else {
      await rbacPrisma.permission.create({
        data: { code: def.code, name: def.name, type: def.type, module: def.module, resource: def.resource, description: def.description },
      });
      permCreated++;
    }
  }
  console.log(`Permissions: +${permCreated} created, ~${permUpdated} updated`);

  // 3. Assign default roles (additive)
  const roleMap = new Map(roles.map((r) => [r.code, r]));
  let assignments = 0;

  for (const def of ALL_PERMISSIONS) {
    if (!def.defaultRoles?.length) continue;
    const perm = await rbacPrisma.permission.findUnique({ where: { code: def.code }, select: { id: true } });
    if (!perm) continue;

    for (const roleCode of def.defaultRoles) {
      const role = roleMap.get(roleCode);
      if (!role) continue;
      const exists = await rbacPrisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!exists) {
        await rbacPrisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
        assignments++;
      }
    }
  }

  console.log(`Role-permission assignments added: ${assignments}`);
  console.log('RBAC seed complete.');
}

main()
  .catch(console.error)
  .finally(() => rbacPrisma.$disconnect());
