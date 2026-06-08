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
    const { module, subjectId } = this.resolveSubject(req);

    if (!module || !subjectId) {
      throw new UnauthorizedException('Authentication required for RBAC check');
    }

    const allowed = await this.rbacService.hasPermission(module, subjectId, permCode);
    if (!allowed) {
      throw new ForbiddenException(`Permission denied: ${permCode}`);
    }

    return true;
  }

  private resolveSubject(req: any): { module?: string; subjectId?: string } {
    // workschd: JwtStrategy populates req.user with accountId
    if (req.user?.accountId) {
      return { module: 'workschd', subjectId: String(req.user.accountId) };
    }
    // investand: InvestandAdminGuard populates req.admin with id
    if (req.admin?.id) {
      return { module: 'investand', subjectId: String(req.admin.id) };
    }
    // aipr: aiprAuthMiddleware populates req.user with id (sub from JWT)
    if (req.user?.id) {
      return { module: 'aipr', subjectId: String(req.user.id) };
    }
    return {};
  }
}
