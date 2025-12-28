import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret'; // Move to config

export class AuthService {
    async login(email: string, pass: string) {
        const account = await prisma.account.findFirst({
            where: { email },
            include: { accountRoles: true }
        });

        if (!account) return null;

        // Verify password (assuming bcrypt was used in Java or we restart with new hashing)
        // Java used BCryptPasswordEncoder.
        // Note: If reusing existing DB, ensuring hash compatibility is key. 
        // Java BCrypt matches Node bcrypt usually.
        const valid = await bcrypt.compare(pass, account.password);
        if (!valid) return null;

        const roles = account.accountRoles.map((r: any) => r.roleType);

        const accessToken = jwt.sign(
            { userId: account.accountId, email: account.email, roles },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { userId: account.accountId },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Optionally save refresh token
        await prisma.account.update({
            where: { accountId: account.accountId },
            data: { refreshToken }
        });

        return { accessToken, refreshToken };
    }
}
