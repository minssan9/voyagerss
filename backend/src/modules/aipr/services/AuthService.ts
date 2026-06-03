import { aiprPrisma as prisma } from '../../../config/prisma';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;   // admin id
  email: string;
  role: string;
}

export class AuthService {
  async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    const payload: JwtPayload = { sub: admin.id, email: admin.email, role: admin.role };

    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    const accessToken = jwt.sign(payload, secret, { expiresIn: '1h' as any });
    const refreshToken = jwt.sign(payload, secret + '-refresh', {
      expiresIn: (process.env.JWT_REFRESH_TTL ?? '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  async refresh(token: string) {
    try {
      const secret = process.env.JWT_SECRET ?? 'dev-secret';
      const payload = jwt.verify(token, secret + '-refresh') as JwtPayload;
      const newPayload: JwtPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      const accessToken = jwt.sign(newPayload, secret, { expiresIn: '1h' as any });
      return { accessToken };
    } catch {
      throw new Error('Invalid refresh token');
    }
  }
}

export const authService = new AuthService();
