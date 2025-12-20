import { workschdPrisma as prisma } from '../../../config/prisma';
import { Account } from '@prisma/client-workschd';

export class AccountService {
    async getAccountById(id: number): Promise<Account | null> {
        return prisma.account.findUnique({
            where: { accountId: id },
            include: {
                accountRoles: true,
                accountInfo: true
            }
        });
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await prisma.account.count({
            where: { email }
        });
        return count > 0;
    }

    async registerForWorkschd(dto: any): Promise<Account> {
        // Map DTO to Prisma input
        // Java: accountDTO.getPassword() (encoded in controller? No, controller encoded it)
        // Here controller should encode it too.

        return prisma.account.create({
            data: {
                username: dto.username,
                email: dto.email,
                password: dto.password, // Already encoded ideally
                status: 'ACTIVE', // Default
                phone: dto.phone,
                // Add other fields
                accountRoles: {
                    create: {
                        roleType: 'ROLE_USER'
                    }
                },
                accountInfo: {
                    create: {}
                }
            }
        });
    }
}
