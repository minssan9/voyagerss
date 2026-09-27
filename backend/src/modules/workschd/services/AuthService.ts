import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import { IdentityService } from '../../identity/identity.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => IdentityService))
    private readonly identityService: IdentityService,
  ) {}

  async login(email: string, pass: string) {
    return this.identityService.passwordLogin(email, pass);
  }

  async signup(email: string, password: string, username: string) {
    const existing = await prisma.account.findFirst({ where: { email } });
    if (existing) {
      const err: any = new Error('Email already registered');
      err.status = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await prisma.account.create({
      data: {
        email,
        username,
        password: hashedPassword,
        status: 'ACTIVE',
        accountRoles: {
          create: [{ roleType: 'USER' }],
        },
      },
      include: { accountRoles: true },
    });

    await this.identityService.linkSignupAccount({
      accountId: account.accountId,
      email: account.email,
      username: account.username,
      password: hashedPassword,
    });

    return account;
  }
}
