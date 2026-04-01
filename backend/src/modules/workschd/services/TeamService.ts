import { Team } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';

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
}
