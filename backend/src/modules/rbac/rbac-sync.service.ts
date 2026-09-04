import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RbacPrismaService } from '../../prisma/rbac-prisma.service';
import { ALL_PERMISSIONS, PermissionDef } from './permissions';

export interface SyncResult {
  created: number;
  updated: number;
  rolesAssigned: number;
  total: number;
}

@Injectable()
export class RbacSyncService implements OnModuleInit {
  private readonly logger = new Logger(RbacSyncService.name);

  constructor(private readonly rbac: RbacPrismaService) {}

  async onModuleInit() {
    try {
      await this.sync();
    } catch (err) {
      // Non-fatal: RBAC DB might not be migrated yet in the environment
      this.logger.warn(`RBAC sync skipped: ${(err as Error).message}`);
    }
  }

  async sync(): Promise<SyncResult> {
    this.logger.log(`Syncing ${ALL_PERMISSIONS.length} declared permissions…`);

    let created = 0;
    let updated = 0;
    let rolesAssigned = 0;

    // Upsert all declared permissions
    for (const def of ALL_PERMISSIONS) {
      const existing = await this.rbac.permission.findUnique({ where: { code: def.code } });
      if (existing) {
        await this.rbac.permission.update({
          where: { code: def.code },
          data: {
            name: def.name,
            type: def.type,
            module: def.module,
            resource: def.resource,
            description: def.description ?? existing.description,
          },
        });
        updated++;
      } else {
        await this.rbac.permission.create({
          data: {
            code: def.code,
            name: def.name,
            type: def.type,
            module: def.module,
            resource: def.resource,
            description: def.description,
          },
        });
        created++;
      }

      // Assign to default roles (additive only — never removes existing assignments)
      if (def.defaultRoles?.length) {
        rolesAssigned += await this.ensureDefaultRoleAssignments(def);
      }
    }

    this.logger.log(
      `RBAC sync complete — created: ${created}, updated: ${updated}, role assignments added: ${rolesAssigned}`,
    );
    return { created, updated, rolesAssigned, total: ALL_PERMISSIONS.length };
  }

  private async ensureDefaultRoleAssignments(def: PermissionDef): Promise<number> {
    const perm = await this.rbac.permission.findUnique({
      where: { code: def.code },
      select: { id: true },
    });
    if (!perm) return 0;

    let count = 0;
    for (const roleCode of def.defaultRoles ?? []) {
      const role = await this.rbac.role.findUnique({
        where: { code: roleCode },
        select: { id: true },
      });
      if (!role) continue;

      const existing = await this.rbac.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!existing) {
        await this.rbac.rolePermission.create({
          data: { roleId: role.id, permissionId: perm.id },
        });
        count++;
      }
    }
    return count;
  }

  /** Returns the code-declared permission list with DB existence status */
  async getDeclaredPermissionsWithStatus() {
    const codes = ALL_PERMISSIONS.map((p) => p.code);
    const dbPerms = await this.rbac.permission.findMany({
      where: { code: { in: codes } },
      select: { code: true, id: true },
    });
    const dbMap = new Map(dbPerms.map((p) => [p.code, p.id]));

    return ALL_PERMISSIONS.map((def) => ({
      ...def,
      inDb: dbMap.has(def.code),
      dbId: dbMap.get(def.code) ?? null,
    }));
  }
}
