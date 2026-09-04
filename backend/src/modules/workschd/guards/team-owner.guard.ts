import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { WorkschdPrismaService } from '../../../prisma/workschd-prisma.service';
import { AuthUser } from '../decorators/user.decorator';

@Injectable()
export class TeamOwnerGuard implements CanActivate {
  constructor(private readonly prisma: WorkschdPrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser = req.user;
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.roles.includes('ADMIN')) return true;

    const teamId = parseInt(req.params.teamId ?? req.body?.teamId);
    if (!teamId) throw new ForbiddenException('Team ID is required');

    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, accountId: user.accountId, role: 'LEADER' },
    });

    if (!member) throw new ForbiddenException('Not a team leader');
    return true;
  }
}
