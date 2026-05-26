import { Injectable } from '@nestjs/common';
import { workschdPrisma as prisma } from '../../../config/prisma';

@Injectable()
export class AccountScheduleService {
    async getTaskRequests(accountId: number, params: { page?: number; size?: number }) {
        const { page = 0, size = 10 } = params;

        const [items, total] = await Promise.all([
            prisma.taskEmployee.findMany({
                where: { accountId },
                skip: page * size,
                take: size,
                orderBy: { appliedAt: 'desc' },
                include: {
                    task: {
                        include: {
                            shop: { select: { id: true, name: true, district: true } }
                        }
                    }
                }
            }),
            prisma.taskEmployee.count({ where: { accountId } })
        ]);

        return {
            content: items,
            totalElements: total,
            totalPages: Math.ceil(total / size),
            size,
            number: page
        };
    }

    async getSchedulePreferences(accountId: number) {
        return {
            accountId,
            preferredDays: [],
            preferredShifts: [],
            maxWorkDaysPerWeek: 5,
            minRestHoursBetweenShifts: 8
        };
    }

    async saveSchedulePreferences(accountId: number, preferences: any) {
        return { accountId, ...preferences, saved: true };
    }

    async getUnavailableDates(accountId: number) {
        return { accountId, dates: [] };
    }

    async saveUnavailableDates(accountId: number, dates: string[]) {
        return { accountId, dates, saved: true };
    }
}
