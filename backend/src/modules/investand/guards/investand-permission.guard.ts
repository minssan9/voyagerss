import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBAC_PERMISSION_KEY } from '../../rbac/decorators/require-permission.decorator';
import { RbacService } from '../../rbac/rbac.service';

export const INVESTAND_PERMISSION_KEY = 'investand_permission';
export const INVESTAND_ADMIN_ROLE_KEY = 'investand_admin_role';

@Injectable()
export class InvestandPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<string>(INVESTAND_PERMISSION_KEY, ctx.getHandler());
    const requireAdminRole = this.reflector.get<boolean>(INVESTAND_ADMIN_ROLE_KEY, ctx.getHandler());
    const rbacPermCode = this.reflector.getAllAndOverride<string>(RBAC_PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    const req = ctx.switchToHttp().getRequest();
    const admin = req.admin;
    if (!admin) throw new UnauthorizedException('Authentication required');

    if (requireAdminRole && admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }

    if (permission) {
      const hasLegacyPermission =
        admin.role === 'SUPER_ADMIN' ||
        admin.role === 'ADMIN' ||
        admin.permissions.includes(permission);
      if (!hasLegacyPermission) throw new ForbiddenException('Insufficient permissions');
    }

    // RBAC permission check (additive on top of legacy checks)
    if (rbacPermCode) {
      const allowed = await this.rbacService.hasPermission('investand', String(admin.id), rbacPermCode);
      if (!allowed) throw new ForbiddenException(`RBAC permission denied: ${rbacPermCode}`);
    }

    return true;
  }
}
