import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;   // admin id
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { sub: admin.id, email: admin.email, role: admin.role };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_TTL ?? '7d',
      secret: (process.env.JWT_SECRET ?? 'dev-secret') + '-refresh',
    });

    return { accessToken, refreshToken };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: (process.env.JWT_SECRET ?? 'dev-secret') + '-refresh',
      });
      const newPayload: JwtPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      return { accessToken: this.jwt.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
