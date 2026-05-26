import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const INVESTAND_PERMISSION_KEY = 'investand_permission';
export const INVESTAND_ADMIN_ROLE_KEY = 'investand_admin_role';

@Injectable()
export class InvestandPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const permission = this.reflector.get<string>(INVESTAND_PERMISSION_KEY, ctx.getHandler());
    const requireAdminRole = this.reflector.get<boolean>(INVESTAND_ADMIN_ROLE_KEY, ctx.getHandler());

    const req = ctx.switchToHttp().getRequest();
    const admin = req.admin;
    if (!admin) throw new UnauthorizedException('Authentication required');

    if (requireAdminRole && admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }

    if (permission) {
      const hasPermission =
        admin.role === 'SUPER_ADMIN' ||
        admin.role === 'ADMIN' ||
        admin.permissions.includes(permission);
      if (!hasPermission) throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
