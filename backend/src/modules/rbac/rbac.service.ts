import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RbacPrismaService } from '../../prisma/rbac-prisma.service';

export type PermissionType = 'PAGE' | 'API';
export type ModuleScope = 'workschd' | 'investand' | 'aipr' | 'aviation' | 'ALL';

export const VALID_MODULES: ReadonlySet<string> = new Set(['workschd', 'investand', 'aipr', 'aviation', 'ALL']);
export const VALID_TYPES: ReadonlySet<string> = new Set(['PAGE', 'API']);

function assertValidModule(module: string) {
  if (!VALID_MODULES.has(module)) {
    throw new BadRequestException(`Invalid module: "${module}". Allowed: ${[...VALID_MODULES].join(', ')}`);
  }
}

function assertValidType(type: string) {
  if (!VALID_TYPES.has(type)) {
    throw new BadRequestException(`Invalid type: "${type}". Allowed: PAGE, API`);
  }
}

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
}

export interface CreatePermissionDto {
  code: string;
  name: string;
  type: PermissionType;
  module: ModuleScope;
  resource: string;
  description?: string;
}

export interface UpdatePermissionDto {
  name?: string;
  type?: PermissionType;
  module?: ModuleScope;
  resource?: string;
  description?: string;
}

@Injectable()
export class RbacService {
  constructor(private readonly rbac: RbacPrismaService) {}

  // ── Permission check ──────────────────────────────────────────────────

  async hasPermission(module: string, subjectId: string, permCode: string): Promise<boolean> {
    const subjectRoles = await this.rbac.subjectRole.findMany({
      where: { module, subjectId },
      include: { role: true },
    });
    if (subjectRoles.length === 0) return false;

    // SUPER_ADMIN bypasses all explicit permission checks
    if (subjectRoles.some((sr) => sr.role.code === 'SUPER_ADMIN')) return true;

    const roleIds = subjectRoles.map((r) => r.roleId);

    // Two-step query (safe with relationMode = "prisma")
    const targetPerm = await this.rbac.permission.findUnique({
      where: { code: permCode },
      select: { id: true },
    });
    if (!targetPerm) return false;

    const link = await this.rbac.rolePermission.findFirst({
      where: { roleId: { in: roleIds }, permissionId: targetPerm.id },
    });
    return link !== null;
  }

  async getSubjectPermissions(module: string, subjectId: string) {
    const subjectRoles = await this.rbac.subjectRole.findMany({
      where: { module, subjectId },
      select: { roleId: true },
    });
    if (subjectRoles.length === 0) return [];

    const roleIds = subjectRoles.map((sr) => sr.roleId);
    const rolePerms = await this.rbac.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });

    const perms = new Map<string, any>();
    for (const rp of rolePerms) {
      perms.set(rp.permission.code, rp.permission);
    }
    return Array.from(perms.values());
  }

  // ── Roles ─────────────────────────────────────────────────────────────

  async listRoles() {
    return this.rbac.role.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { rolePermissions: true, subjectRoles: true } } },
    });
  }

  async getRole(id: number) {
    const role = await this.rbac.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { subjectRoles: true } },
      },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.rbac.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Role code "${dto.code}" already exists`);
    return this.rbac.role.create({ data: dto });
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    await this.getRole(id);
    return this.rbac.role.update({ where: { id }, data: dto });
  }

  async deleteRole(id: number) {
    const role = await this.getRole(id);
    if (role.isSystem) throw new ConflictException('Cannot delete a system role');
    await (this.rbac.$transaction as any)(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.subjectRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
  }

  // ── Permissions ───────────────────────────────────────────────────────

  async listPermissions(module?: string, type?: string) {
    return this.rbac.permission.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(type ? { type } : {}),
      },
      orderBy: [{ module: 'asc' }, { type: 'asc' }, { code: 'asc' }],
    });
  }

  async getPermission(id: number) {
    const perm = await this.rbac.permission.findUnique({ where: { id } });
    if (!perm) throw new NotFoundException(`Permission ${id} not found`);
    return perm;
  }

  async createPermission(dto: CreatePermissionDto) {
    assertValidType(dto.type);
    assertValidModule(dto.module);
    const existing = await this.rbac.permission.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Permission code "${dto.code}" already exists`);
    return this.rbac.permission.create({ data: dto });
  }

  async updatePermission(id: number, dto: UpdatePermissionDto) {
    if (dto.type) assertValidType(dto.type);
    if (dto.module) assertValidModule(dto.module);
    await this.getPermission(id);
    return this.rbac.permission.update({ where: { id }, data: dto });
  }

  async deletePermission(id: number) {
    await this.getPermission(id);
    await (this.rbac.$transaction as any)(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { permissionId: id } });
      await tx.permission.delete({ where: { id } });
    });
  }

  // ── Role-Permission assignments ───────────────────────────────────────

  async getRolePermissions(roleId: number) {
    await this.getRole(roleId);
    return this.rbac.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
  }

  async assignPermissionToRole(roleId: number, permissionId: number) {
    await this.getRole(roleId);
    await this.getPermission(permissionId);
    return this.rbac.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async removePermissionFromRole(roleId: number, permissionId: number) {
    return this.rbac.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  async setRolePermissions(roleId: number, permissionIds: number[]) {
    await this.getRole(roleId);

    if (permissionIds.length > 0) {
      const validCount = await this.rbac.permission.count({ where: { id: { in: permissionIds } } });
      if (validCount !== permissionIds.length) {
        throw new ConflictException('One or more permission IDs are invalid');
      }
    }

    await (this.rbac.$transaction as any)(async (tx: any) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
          skipDuplicates: true,
        });
      }
    });
  }

  // ── Subject-Role assignments ──────────────────────────────────────────

  async listSubjectRoles(module?: string, subjectId?: string) {
    return this.rbac.subjectRole.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(subjectId ? { subjectId } : {}),
      },
      include: { role: true },
      orderBy: [{ module: 'asc' }, { subjectId: 'asc' }],
    });
  }

  async getSubjectRoles(module: string, subjectId: string) {
    return this.rbac.subjectRole.findMany({
      where: { module, subjectId },
      include: { role: true },
    });
  }

  async assignRoleToSubject(module: string, subjectId: string, roleId: number) {
    assertValidModule(module);
    await this.getRole(roleId);
    return this.rbac.subjectRole.upsert({
      where: { module_subjectId_roleId: { module, subjectId, roleId } },
      create: { module, subjectId, roleId },
      update: {},
    });
  }

  async removeRoleFromSubject(module: string, subjectId: string, roleId: number) {
    return this.rbac.subjectRole.deleteMany({ where: { module, subjectId, roleId } });
  }

  async setSubjectRoles(module: string, subjectId: string, roleIds: number[]) {
    assertValidModule(module);
    if (roleIds.length > 0) {
      const validCount = await this.rbac.role.count({ where: { id: { in: roleIds } } });
      if (validCount !== roleIds.length) {
        throw new ConflictException('One or more role IDs are invalid');
      }
    }

    await (this.rbac.$transaction as any)(async (tx: any) => {
      await tx.subjectRole.deleteMany({ where: { module, subjectId } });
      if (roleIds.length > 0) {
        await tx.subjectRole.createMany({
          data: roleIds.map((roleId) => ({ module, subjectId, roleId })),
          skipDuplicates: true,
        });
      }
    });
  }
}
