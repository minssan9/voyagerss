import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '../middleware/authMiddleware';
import { InvestandPrismaService } from '../../../prisma/investand-prisma.service';

@Injectable()
export class InvestandAdminGuard implements CanActivate {
  constructor(private readonly prisma: InvestandPrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader = req.headers.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    const tokenUser = verifyToken(token);
    if (!tokenUser) throw new UnauthorizedException('Invalid token');

    const dbUser = await this.prisma.adminUser.findUnique({
      where: { id: tokenUser.id },
      select: {
        id: true, username: true, email: true, role: true,
        permissions: true, isActive: true, isLocked: true,
        lastLoginAt: true, mustChangePassword: true,
      },
    });

    if (!dbUser || !dbUser.isActive || dbUser.isLocked) {
      throw new UnauthorizedException('Account is not accessible');
    }

    req.admin = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email ?? undefined,
      role: dbUser.role,
      permissions: JSON.parse((dbUser.permissions as string) || '[]'),
      mfaEnabled: false,
      isActive: dbUser.isActive,
      isLocked: dbUser.isLocked,
      mustChangePassword: dbUser.mustChangePassword,
    };

    return true;
  }
}
