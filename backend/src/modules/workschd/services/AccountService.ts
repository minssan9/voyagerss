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

    async updateAccount(accountId: number, updateData: Partial<Account>): Promise<Account> {
        // Remove fields that shouldn't be updated directly
        const { password, email, ...safeUpdateData } = updateData;

        const updatePayload: any = {
            ...safeUpdateData
        };

        // If password is provided, hash it before updating
        if (password) {
            const bcrypt = require('bcrypt');
            updatePayload.password = await bcrypt.hash(password, 10);
        }

        return prisma.account.update({
            where: { accountId },
            data: updatePayload,
            include: {
                accountRoles: true,
                accountInfo: true
            }
        });
    }

    async updateProfile(accountId: number, profileData: { name?: string; phone?: string; bio?: string }): Promise<Account> {
        return prisma.account.update({
            where: { accountId },
            data: {
                name: profileData.name,
                phone: profileData.phone
            },
            include: {
                accountRoles: true,
                accountInfo: true
            }
        });
    }

    async changePassword(accountId: number, oldPassword: string, newPassword: string): Promise<void> {
        const account = await this.getAccountById(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(oldPassword, account.password);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.account.update({
            where: { accountId },
            data: { password: hashedPassword }
        });
    }
}
