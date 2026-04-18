import { Team, TeamMember } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';
import crypto from 'crypto';

export class TeamService {
    async getTeamById(id: number): Promise<Team | null> {
        return prisma.team.findUnique({
            where: { id },
            include: {
                teamMembers: {
                    include: {
                        account: {
                            select: {
                                accountId: true,
                                username: true,
                                email: true,
                                profileImageUrl: true
                            }
                        }
                    }
                }
            }
        });
    }

    async getTeams(params: { page?: number; size?: number; name?: string; region?: string; scheduleType?: string }) {
        const { page = 0, size = 10, name, region, scheduleType } = params;
        const where: any = {};
        if (name) where.name = { contains: name };
        if (region) where.region = region;
        if (scheduleType) where.scheduleType = scheduleType;

        const [items, total] = await Promise.all([
            prisma.team.findMany({
                where,
                skip: page * size,
                take: size,
                orderBy: { createdAt: 'desc' },
                include: { teamMembers: { select: { id: true } } }
            }),
            prisma.team.count({ where })
        ]);

        return {
            content: items.map(t => ({ ...t, memberCount: t.teamMembers.length })),
            totalElements: total,
            totalPages: Math.ceil(total / size),
            size,
            number: page
        };
    }

    async createTeam(data: { name: string; region: string; scheduleType?: string; location?: string }, creatorAccountId: number) {
        return prisma.team.create({
            data: {
                name: data.name,
                region: data.region,
                scheduleType: data.scheduleType,
                location: data.location,
                teamMembers: {
                    create: {
                        accountId: creatorAccountId,
                        role: 'LEADER'
                    }
                }
            },
            include: {
                teamMembers: {
                    include: {
                        account: {
                            select: { accountId: true, username: true, email: true }
                        }
                    }
                }
            }
        });
    }

    async generateInviteLink(teamId: number) {
        const hash = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const team = await prisma.team.update({
            where: { id: teamId },
            data: {
                invitationHash: hash,
                invitationCreatedAt: new Date(),
                invitationExpireAt: expiresAt
            }
        });

        return { invitationHash: team.invitationHash, expireAt: team.invitationExpireAt };
    }

    async joinByInviteHash(hash: string, accountId: number) {
        const team = await prisma.team.findFirst({
            where: {
                invitationHash: hash,
                invitationExpireAt: { gt: new Date() }
            }
        });

        if (!team) {
            throw new Error('Invalid or expired invitation link');
        }

        const existing = await prisma.teamMember.findFirst({
            where: { teamId: team.id, accountId }
        });
        if (existing) {
            throw new Error('Already a member of this team');
        }

        const member = await prisma.teamMember.create({
            data: {
                teamId: team.id,
                accountId,
                role: 'MEMBER'
            }
        });

        return { teamId: team.id, teamName: team.name, memberId: member.id };
    }

    async getTeamMembers(teamId: number, params: { page?: number; size?: number; name?: string; email?: string; status?: string }) {
        const { page = 0, size = 10, name, email } = params;
        const where: any = { teamId };

        if (name || email) {
            where.account = {};
            if (name) where.account.username = { contains: name };
            if (email) where.account.email = { contains: email };
        }

        const [items, total] = await Promise.all([
            prisma.teamMember.findMany({
                where,
                skip: page * size,
                take: size,
                orderBy: { joinedAt: 'desc' },
                include: {
                    account: {
                        select: {
                            accountId: true,
                            username: true,
                            email: true,
                            profileImageUrl: true
                        }
                    }
                }
            }),
            prisma.teamMember.count({ where })
        ]);

        return {
            content: items.map(m => ({
                id: m.id,
                teamId: m.teamId,
                accountId: m.accountId,
                role: m.role,
                joinedAt: m.joinedAt,
                username: m.account.username,
                email: m.account.email,
                profileImageUrl: m.account.profileImageUrl
            })),
            totalElements: total,
            totalPages: Math.ceil(total / size),
            size,
            number: page
        };
    }

    async approveJoinRequest(teamId: number, requestId: number) {
        const member = await prisma.teamMember.findFirst({
            where: { id: requestId, teamId }
        });

        if (!member) {
            throw new Error('Join request not found');
        }

        return prisma.teamMember.update({
            where: { id: requestId },
            data: { role: 'MEMBER' }
        });
    }

    async getScheduleConfig(teamId: number) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new Error('Team not found');
        return {
            teamId,
            minStaffPerDay: { MONDAY: 1, TUESDAY: 1, WEDNESDAY: 1, THURSDAY: 1, FRIDAY: 1, SATURDAY: 1, SUNDAY: 1 },
            maxOffDaysPerMonth: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4 },
            additionalOptions: {
                allowWeekendWork: true,
                enforceMinimumRest: true,
                maxConsecutiveWorkDays: 5,
                scheduleGenerationFrequency: 'MONTHLY'
            }
        };
    }

    async saveScheduleConfig(teamId: number, config: any) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new Error('Team not found');
        return { teamId, ...config, saved: true };
    }
}
