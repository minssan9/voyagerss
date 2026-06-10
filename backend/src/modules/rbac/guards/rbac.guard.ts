import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RBAC_PERMISSION_KEY } from '../decorators/require-permission.decorator';
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

    if (!permCode) return true;

    const req = context.switchToHttp().getRequest();
    // Derive module from the permission code prefix (e.g. "workschd:api:...")
    const module = permCode.split(':')[0];
    const subjectId = this.resolveSubjectId(req, module);

    if (!subjectId) {
      throw new UnauthorizedException('Authentication required for RBAC check');
    }

    const allowed = await this.rbacService.hasPermission(module, subjectId, permCode);
    if (!allowed) {
      throw new ForbiddenException(`Permission denied: ${permCode}`);
    }

    return true;
  }

  private resolveSubjectId(req: any, module: string): string | undefined {
    switch (module) {
      case 'workschd':
        return req.user?.accountId ? String(req.user.accountId) : undefined;
      case 'investand':
        return req.admin?.id ? String(req.admin.id) : undefined;
      case 'aipr':
        return req.user?.id ? String(req.user.id) : undefined;
      default:
        // Fallback: try all known identity slots
        return req.user?.accountId
          ? String(req.user.accountId)
          : req.admin?.id
          ? String(req.admin.id)
          : req.user?.id
          ? String(req.user.id)
          : undefined;
    }
  }
}
