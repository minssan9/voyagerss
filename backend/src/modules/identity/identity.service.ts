import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client-identity';
import { configService } from '../../config/config-service';
import { workschdPrisma, aiprPrisma } from '../../config/prisma';
import { IdentityPrismaService } from './identity-prisma.service';
import { RbacAssignmentService } from '../rbac/rbac-assignment.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthProfile {
  email?: string;
  username: string;
  profileImageUrl?: string;
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly identityPrisma: IdentityPrismaService,
    private readonly rbacAssignment: RbacAssignmentService,
  ) {}

  async passwordLogin(emailOrUsername: string, password: string): Promise<AuthTokens | null> {
    const identityUser = await this.identityPrisma.user.findFirst({
      where: { email: emailOrUsername },
    });

    if (identityUser?.passwordHash) {
      const valid = await bcrypt.compare(password, identityUser.passwordHash);
      if (!valid) return null;
      if (identityUser.status !== 'ACTIVE') return null;
      return this.issueTokens(identityUser);
    }

    const account = await workschdPrisma.account.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!account) return null;

    const valid = await bcrypt.compare(password, account.password);
    if (!valid) return null;
    if (account.status !== 'ACTIVE') return null;

    const user = await this.identityPrisma.user.create({
      data: {
        email: account.email,
        displayName: account.username,
        passwordHash: account.password,
        status: 'ACTIVE',
        moduleLinks: {
          create: { module: 'workschd', subjectId: String(account.accountId) },
        },
      },
    });

    await this.rbacAssignment.assignDefaultWorkschdViewer(user.id);
    await this.tryLinkAiprAdmin(user);

    return this.issueTokens(user);
  }

  async oauthUpsert(
    provider: string,
    providerId: string,
    profile: OAuthProfile,
  ): Promise<{ tokens: AuthTokens; user: User }> {
    const existingOAuth = await this.identityPrisma.oauthAccount.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });

    let user: User;

    if (existingOAuth) {
      user = existingOAuth.user;
    } else if (profile.email) {
      user =
        (await this.identityPrisma.user.findFirst({ where: { email: profile.email } })) ??
        (await this.identityPrisma.user.create({
          data: {
            email: profile.email,
            displayName: profile.username,
            status: 'ACTIVE',
          },
        }));

      await this.identityPrisma.oauthAccount.create({
        data: { userId: user.id, provider, providerId },
      });
    } else {
      user = await this.identityPrisma.user.create({
        data: {
          displayName: profile.username,
          status: 'ACTIVE',
          oauthAccounts: {
            create: { provider, providerId },
          },
        },
      });
    }

    await this.ensureWorkschdLink(user.id, profile);
    await this.tryLinkAiprAdmin(user);

    const refreshedUser = await this.identityPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return { tokens: await this.issueTokens(refreshedUser), user: refreshedUser };
  }

  async ensureWorkschdLink(userId: string, profile: OAuthProfile): Promise<number> {
    const existingLink = await this.identityPrisma.moduleLink.findUnique({
      where: { userId_module: { userId, module: 'workschd' } },
    });

    if (existingLink) {
      return Number(existingLink.subjectId);
    }

    let account: { accountId: number } | null = null;

    if (profile.email) {
      account = await workschdPrisma.account.findFirst({
        where: { email: profile.email },
        select: { accountId: true },
      });
    }

    if (!account) {
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      account = await workschdPrisma.account.create({
        data: {
          username: profile.username,
          email: profile.email,
          password: randomPassword,
          status: 'ACTIVE',
          profileImageUrl: profile.profileImageUrl,
          accountRoles: { create: [{ roleType: 'HELPER' }] },
        },
        select: { accountId: true },
      });
    }

    await this.identityPrisma.moduleLink.create({
      data: {
        userId,
        module: 'workschd',
        subjectId: String(account.accountId),
      },
    });

    await this.rbacAssignment.assignDefaultWorkschdViewer(userId);

    return account.accountId;
  }

  async linkSignupAccount(account: {
    accountId: number;
    email: string | null;
    username: string;
    password: string;
  }): Promise<User> {
    const user = await this.identityPrisma.user.create({
      data: {
        email: account.email,
        displayName: account.username,
        passwordHash: account.password,
        status: 'ACTIVE',
        moduleLinks: {
          create: { module: 'workschd', subjectId: String(account.accountId) },
        },
      },
    });

    await this.rbacAssignment.assignDefaultWorkschdViewer(user.id);
    return user;
  }

  async getMe(userId: string) {
    const user = await this.identityPrisma.user.findUnique({
      where: { id: userId },
      include: { moduleLinks: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      links: user.moduleLinks.map((link) => ({
        module: link.module,
        subjectId: link.subjectId,
      })),
    };
  }

  private async tryLinkAiprAdmin(user: User): Promise<void> {
    if (!user.email) return;

    try {
      const existingLink = await this.identityPrisma.moduleLink.findUnique({
        where: { userId_module: { userId: user.id, module: 'aipr' } },
      });
      if (existingLink) return;

      const admin = await aiprPrisma.admin.findUnique({ where: { email: user.email } });
      if (!admin) return;

      await this.identityPrisma.moduleLink.create({
        data: {
          userId: user.id,
          module: 'aipr',
          subjectId: admin.id,
        },
      });
    } catch {
      // AIPR database may be unavailable or schema mismatched — skip silently.
    }
  }

  issueTokens(user: Pick<User, 'id' | 'email'>): AuthTokens {
    const secretKey = configService.get('JWT_SECRET', 'default_secret')!;

    const accessToken = jwt.sign({ sub: user.id, email: user.email ?? undefined }, secretKey, {
      expiresIn: '1h',
    });

    const refreshToken = jwt.sign({ sub: user.id }, secretKey, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
