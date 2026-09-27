import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { configService } from '../../../config/config-service';
import { WorkschdPrismaService } from '../../../prisma/workschd-prisma.service';
import { IdentityPrismaService } from '../../identity/identity-prisma.service';
import { AuthUser } from '../decorators/user.decorator';

interface JwtPayload {
  sub?: string;
  userId?: number;
  accountId?: number;
  email?: string;
  roles?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: WorkschdPrismaService,
    private readonly identityPrisma: IdentityPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'default_secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.sub && Number.isNaN(Number(payload.sub))) {
      const identityUserId = payload.sub;
      const identityUser = await this.identityPrisma.user.findUnique({
        where: { id: identityUserId },
      });

      if (!identityUser || identityUser.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token');
      }

      const link = await this.identityPrisma.moduleLink.findUnique({
        where: { userId_module: { userId: identityUserId, module: 'workschd' } },
      });

      if (!link) {
        return {
          email: identityUser.email ?? payload.email ?? '',
          roles: [],
          identityUserId,
        };
      }

      const accountId = Number(link.subjectId);
      const account = await this.prisma.account.findUnique({
        where: { accountId },
        include: { accountRoles: true },
      });

      if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token or inactive account');
      }

      return {
        accountId: account.accountId,
        email: account.email ?? payload.email ?? '',
        roles: account.accountRoles.map((r: { roleType: string }) => r.roleType),
        identityUserId,
      };
    }

    const accountId = payload.accountId ?? payload.userId;
    if (!accountId) throw new UnauthorizedException('Invalid token');

    const account = await this.prisma.account.findUnique({
      where: { accountId },
      include: { accountRoles: true },
    });

    if (!account || account.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid token or inactive account');
    }

    return {
      accountId: account.accountId,
      email: account.email ?? '',
      roles: account.accountRoles.map((r: { roleType: string }) => r.roleType),
    };
  }
}
