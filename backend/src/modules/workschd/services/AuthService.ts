import { Injectable } from '@nestjs/common';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { configService } from '../../../config/config-service';

@Injectable()
export class AuthService {
    async login(email: string, pass: string) {
        const account = await prisma.account.findFirst({
            where: { email },
            include: { accountRoles: true }
        });

        if (!account) return null;

        const valid = await bcrypt.compare(pass, account.password);
        if (!valid) return null;

        const roles = account.accountRoles.map((r: any) => r.roleType);
        const secretKey = configService.get('JWT_SECRET', 'default_secret')!;

        const accessToken = jwt.sign(
            { userId: account.accountId, email: account.email, roles },
            secretKey,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { userId: account.accountId },
            secretKey,
            { expiresIn: '7d' }
        );

        await prisma.account.update({
            where: { accountId: account.accountId },
            data: { refreshToken }
        });

        return { accessToken, refreshToken };
    }
}
