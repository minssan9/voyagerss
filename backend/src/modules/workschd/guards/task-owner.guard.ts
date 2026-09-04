import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkschdPrismaService } from '../../../prisma/workschd-prisma.service';
import { AuthUser } from '../decorators/user.decorator';

@Injectable()
export class TaskOwnerGuard implements CanActivate {
  constructor(private readonly prisma: WorkschdPrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser = req.user;
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.roles.includes('ADMIN')) return true;

    const taskId = parseInt(req.params.id ?? req.params.taskId);
    if (!taskId) throw new ForbiddenException('Task ID is required');

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.createdBy !== user.accountId) throw new ForbiddenException('Not the task owner');

    return true;
  }
}
