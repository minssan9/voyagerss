import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBAC_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { RBAC_ADMIN_KEY } from '../decorators/require-rbac-admin.decorator';
import { RbacService } from '../rbac.service';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permCode = this.reflector.getAllAndOverride<string>(RBAC_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requireAdmin = this.reflector.getAllAndOverride<boolean>(RBAC_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permCode && !requireAdmin) return true;

    const req = context.switchToHttp().getRequest();
    const subjectId = this.resolveSubjectId(req);

    if (!subjectId) {
      throw new UnauthorizedException('Authentication required for RBAC check');
    }

    if (permCode) {
      const module = permCode.split(':')[0];
      const allowed =
        (await this.rbacService.hasPermission(module, subjectId, permCode)) ||
        (await this.rbacService.isAdmin(subjectId));
      if (!allowed) {
        throw new ForbiddenException(`Permission denied: ${permCode}`);
      }
      return true;
    }

    const isAdmin = await this.rbacService.isAdmin(subjectId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }

  private resolveSubjectId(req: any): string | undefined {
    const identityUserId = req.user?.identityUserId;
    return identityUserId ? String(identityUserId) : undefined;
  }
}
