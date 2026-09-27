import { HttpStatus, Injectable } from '@nestjs/common';
import { I18nHttpException } from '../../common/i18n-http.exception';
import { tApi } from '../../common/i18n-locale';
import { Team, TeamMember } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';
import crypto from 'crypto';
import { apiSuccess } from '../utils/api-response';

@Injectable()
export class TeamService {
    private async assertTeamLeaderOrAdmin(teamId: number, accountId: number, userRoles: string[]) {
        if (userRoles.includes('ADMIN')) return;

        const leader = await prisma.teamMember.findFirst({
            where: { teamId, accountId, role: 'LEADER' },
        });
        if (!leader) {
            throw new I18nHttpException('workschd.team.leadersOnly', HttpStatus.FORBIDDEN);
        }
    }

    private mapJoinRequest(request: {
        id: number;
        teamId: number;
        accountId: number;
        status: string;
        createdAt: Date;
        account?: { accountId: number; username: string; email: string | null };
    }) {
        return {
            id: request.id,
            teamId: request.teamId,
            accountId: request.accountId,
            userId: request.accountId,
            userName: request.account?.username,
            email: request.account?.email,
            requestDate: request.createdAt,
            status: request.status,
        };
    }

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
                include: {
                    teamMembers: { select: { id: true } },
                    teamJoinRequests: {
                        where: { status: 'PENDING' },
                        include: {
                            account: {
                                select: { accountId: true, username: true, email: true },
                            },
                        },
                    },
                },
            }),
            prisma.team.count({ where })
        ]);

        return {
            content: items.map(t => ({
                ...t,
                memberCount: t.teamMembers.length,
                joinRequests: t.teamJoinRequests.map((r) => this.mapJoinRequest(r)),
                teamJoinRequests: undefined,
            })),
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
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
            where: { invitationHash: hash },
        });

        if (!team) {
            throw new I18nHttpException('workschd.team.invalidInvite', HttpStatus.BAD_REQUEST);
        }

        if (!team.invitationExpireAt || team.invitationExpireAt <= new Date()) {
            throw new I18nHttpException('workschd.team.inviteExpired', HttpStatus.BAD_REQUEST);
        }

        const existingMember = await prisma.teamMember.findFirst({
            where: { teamId: team.id, accountId },
        });
        if (existingMember) {
            return apiSuccess(tApi('workschd.team.alreadyMember'), {
                status: 'already-member',
                teamId: team.id,
                teamName: team.name,
                memberId: existingMember.id,
            });
        }

        const existingRequest = await prisma.teamJoinRequest.findUnique({
            where: { teamId_accountId: { teamId: team.id, accountId } },
        });

        if (existingRequest?.status === 'PENDING') {
            return apiSuccess('Join request already pending', {
                status: 'pending',
                teamId: team.id,
                teamName: team.name,
                requestId: existingRequest.id,
            });
        }

        let request;
        if (existingRequest) {
            request = await prisma.teamJoinRequest.update({
                where: { id: existingRequest.id },
                data: {
                    status: 'PENDING',
                    createdAt: new Date(),
                    decidedAt: null,
                    decidedBy: null,
                },
            });
        } else {
            request = await prisma.teamJoinRequest.create({
                data: {
                    teamId: team.id,
                    accountId,
                    status: 'PENDING',
                },
            });
        }

        return apiSuccess('Join request submitted', {
            status: 'pending',
            teamId: team.id,
            teamName: team.name,
            requestId: request.id,
        });
    }

    async getPendingJoinRequests(teamId: number, accountId: number, userRoles: string[]) {
        await this.assertTeamLeaderOrAdmin(teamId, accountId, userRoles);

        const requests = await prisma.teamJoinRequest.findMany({
            where: { teamId, status: 'PENDING' },
            include: {
                account: {
                    select: { accountId: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return apiSuccess('Pending join requests', requests.map((r) => this.mapJoinRequest(r)));
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

    async approveJoinRequest(teamId: number, requestId: number, decidedBy: number, userRoles: string[]) {
        await this.assertTeamLeaderOrAdmin(teamId, decidedBy, userRoles);

        const request = await prisma.teamJoinRequest.findFirst({
            where: { id: requestId, teamId, status: 'PENDING' },
        });

        if (!request) {
            throw new I18nHttpException('workschd.team.joinNotFound', HttpStatus.NOT_FOUND);
        }

        await prisma.$transaction(async (tx) => {
            const existingMember = await tx.teamMember.findFirst({
                where: { teamId, accountId: request.accountId },
            });

            if (!existingMember) {
                await tx.teamMember.create({
                    data: {
                        teamId,
                        accountId: request.accountId,
                        role: 'MEMBER',
                    },
                });
            }

            await tx.teamJoinRequest.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    decidedAt: new Date(),
                    decidedBy,
                },
            });
        });

        return apiSuccess(tApi('workschd.team.joinApproved'), { requestId, teamId, status: 'APPROVED' });
    }

    async rejectJoinRequest(teamId: number, requestId: number, decidedBy: number, userRoles: string[]) {
        await this.assertTeamLeaderOrAdmin(teamId, decidedBy, userRoles);

        const request = await prisma.teamJoinRequest.findFirst({
            where: { id: requestId, teamId, status: 'PENDING' },
        });

        if (!request) {
            throw new I18nHttpException('workschd.team.joinNotFound', HttpStatus.NOT_FOUND);
        }

        await prisma.teamJoinRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                decidedAt: new Date(),
                decidedBy,
            },
        });

        return apiSuccess(tApi('workschd.team.joinRejected'), { requestId, teamId, status: 'REJECTED' });
    }

    async getScheduleConfig(teamId: number) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new I18nHttpException('workschd.team.notFound', HttpStatus.NOT_FOUND);
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
        if (!team) throw new I18nHttpException('workschd.team.notFound', HttpStatus.NOT_FOUND);
        return { teamId, ...config, saved: true };
    }
}
