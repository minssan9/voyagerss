import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '../../../config/config-service';
import { WorkschdPrismaService } from '../../../prisma/workschd-prisma.service';
import { AuthUser } from '../decorators/user.decorator';

interface JwtPayload {
  userId?: number;
  accountId?: number;
  email?: string;
  roles?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: WorkschdPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Secret resolved at construction time — config is initialized before module bootstrap
      secretOrKey: configService.get('JWT_SECRET', 'your-secret-key')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Support both userId (from current AuthService.login) and accountId
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
      roles: account.accountRoles.map((r: any) => r.roleType),
    };
  }
}
