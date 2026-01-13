import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardStatistics {
    totalTasks: number;
    openTasks: number;
    closedTasks: number;
    cancelledTasks: number;
    totalWorkers: number;
    activeWorkers: number;
    totalTeams: number;
    activeTeams: number;
    totalNotifications: number;
    unreadNotifications: number;
    tasksByStatus: TaskStatusCount[];
    tasksByRegion: TaskRegionCount[];
    workersByTeam: WorkerTeamCount[];
    recentActivities: RecentActivity[];
}

export interface TaskStatusCount {
    status: string;
    count: number;
}

export interface TaskRegionCount {
    region: string;
    count: number;
}

export interface WorkerTeamCount {
    teamId: number;
    teamName: string;
    workerCount: number;
}

export interface RecentActivity {
    id: string;
    type: 'TASK_CREATED' | 'TASK_UPDATED' | 'JOIN_REQUEST' | 'JOIN_APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT';
    title: string;
    description: string;
    timestamp: Date;
    icon: string;
    color: string;
}

export interface TeamStatistics {
    teamId: number;
    teamName: string;
    totalTasks: number;
    openTasks: number;
    completedTasks: number;
    totalMembers: number;
    activeMembers: number;
    totalShops: number;
    checkInRate: number;
}

export interface WorkerStatistics {
    workerId: number;
    workerName: string;
    totalTasksAssigned: number;
    completedTasks: number;
    cancelledTasks: number;
    checkInCount: number;
    checkOutCount: number;
    averageWorkHours: number;
}

export class StatisticsService {
    /**
     * Get overall dashboard statistics
     */
    async getDashboardStatistics(): Promise<DashboardStatistics> {
        try {
            // Aggregate queries for performance
            const [
                totalTasks,
                tasksByStatus,
                totalWorkers,
                activeWorkersCount,
                totalTeams,
                activeTeamsCount,
                totalNotifications,
                unreadNotificationsCount,
                tasksByRegion,
                recentTasks,
                recentJoinRequests,
                recentCheckIns
            ] = await Promise.all([
                // Total tasks
                prisma.task.count(),

                // Tasks by status
                prisma.task.groupBy({
                    by: ['status'],
                    _count: true
                }),

                // Total workers (accounts with HELPER role)
                prisma.account.count({
                    where: { role: 'HELPER' }
                }),

                // Active workers (workers who checked in recently - last 7 days)
                prisma.taskEmployee.count({
                    where: {
                        joinedAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    distinct: ['accountId']
                }),

                // Total teams
                prisma.team.count(),

                // Active teams (teams with tasks in last 30 days)
                prisma.team.count({
                    where: {
                        tasks: {
                            some: {
                                taskDate: {
                                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                                }
                            }
                        }
                    }
                }),

                // Total notifications
                prisma.notification.count(),

                // Unread notifications
                prisma.notification.count({
                    where: { isRead: false }
                }),

                // Tasks by region
                prisma.task.groupBy({
                    by: ['region'],
                    _count: true,
                    orderBy: {
                        _count: {
                            region: 'desc'
                        }
                    },
                    take: 10
                }),

                // Recent tasks (last 10)
                prisma.task.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        createdBy: {
                            select: { name: true }
                        }
                    }
                }),

                // Recent join requests (last 5)
                prisma.taskEmployee.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    where: { status: 'PENDING' },
                    select: {
                        id: true,
                        createdAt: true,
                        account: {
                            select: { name: true }
                        },
                        task: {
                            select: { title: true }
                        }
                    }
                }),

                // Recent check-ins (last 5)
                prisma.taskEmployee.findMany({
                    take: 5,
                    orderBy: { joinedAt: 'desc' },
                    where: {
                        joinedAt: { not: null }
                    },
                    select: {
                        id: true,
                        joinedAt: true,
                        account: {
                            select: { name: true }
                        },
                        task: {
                            select: { title: true }
                        }
                    }
                })
            ]);

            // Transform tasks by status
            const statusCounts: TaskStatusCount[] = tasksByStatus.map(item => ({
                status: item.status,
                count: item._count
            }));

            const openTasks = statusCounts.find(s => s.status === 'OPEN')?.count || 0;
            const closedTasks = statusCounts.find(s => s.status === 'CLOSED')?.count || 0;
            const cancelledTasks = statusCounts.find(s => s.status === 'CANCELLED')?.count || 0;

            // Transform tasks by region
            const regionCounts: TaskRegionCount[] = tasksByRegion.map(item => ({
                region: item.region,
                count: item._count
            }));

            // Build recent activities from multiple sources
            const recentActivities: RecentActivity[] = [];

            // Add task activities
            recentTasks.forEach(task => {
                recentActivities.push({
                    id: `task-${task.id}`,
                    type: 'TASK_CREATED',
                    title: 'New task created',
                    description: `${task.title} by ${task.createdBy.name}`,
                    timestamp: task.createdAt,
                    icon: 'add_task',
                    color: 'blue'
                });
            });

            // Add join request activities
            recentJoinRequests.forEach(request => {
                recentActivities.push({
                    id: `join-${request.id}`,
                    type: 'JOIN_REQUEST',
                    title: 'Join request pending',
                    description: `${request.account.name} requested to join ${request.task.title}`,
                    timestamp: request.createdAt,
                    icon: 'person_add',
                    color: 'orange'
                });
            });

            // Add check-in activities
            recentCheckIns.forEach(checkIn => {
                recentActivities.push({
                    id: `checkin-${checkIn.id}`,
                    type: 'CHECKED_IN',
                    title: 'Worker checked in',
                    description: `${checkIn.account.name} checked in to ${checkIn.task.title}`,
                    timestamp: checkIn.joinedAt!,
                    icon: 'login',
                    color: 'green'
                });
            });

            // Sort by timestamp descending and take top 15
            recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            const topActivities = recentActivities.slice(0, 15);

            return {
                totalTasks,
                openTasks,
                closedTasks,
                cancelledTasks,
                totalWorkers,
                activeWorkers: activeWorkersCount,
                totalTeams,
                activeTeams: activeTeamsCount,
                totalNotifications,
                unreadNotifications: unreadNotificationsCount,
                tasksByStatus: statusCounts,
                tasksByRegion: regionCounts,
                workersByTeam: [], // Will be populated if needed
                recentActivities: topActivities
            };
        } catch (error) {
            console.error('[StatisticsService] Error getting dashboard statistics:', error);
            throw new Error('Failed to fetch dashboard statistics');
        }
    }

    /**
     * Get statistics for a specific team
     */
    async getTeamStatistics(teamId: number): Promise<TeamStatistics> {
        try {
            const [team, totalTasks, tasksByStatus, totalMembers, totalShops, checkInData] = await Promise.all([
                prisma.team.findUnique({
                    where: { id: teamId },
                    select: { name: true }
                }),

                prisma.task.count({
                    where: { teamId }
                }),

                prisma.task.groupBy({
                    by: ['status'],
                    where: { teamId },
                    _count: true
                }),

                prisma.teamMember.count({
                    where: { teamId }
                }),

                prisma.shop.count({
                    where: { teamId }
                }),

                // Calculate check-in rate
                prisma.taskEmployee.aggregate({
                    where: {
                        task: { teamId }
                    },
                    _count: {
                        id: true
                    }
                })
            ]);

            if (!team) {
                throw new Error('Team not found');
            }

            const openTasks = tasksByStatus.find(s => s.status === 'OPEN')?._count || 0;
            const completedTasks = tasksByStatus.find(s => s.status === 'CLOSED')?._count || 0;

            // Calculate check-in rate (workers who checked in / total assigned)
            const checkedInCount = await prisma.taskEmployee.count({
                where: {
                    task: { teamId },
                    joinedAt: { not: null }
                }
            });

            const totalAssignedWorkers = checkInData._count.id || 1;
            const checkInRate = (checkedInCount / totalAssignedWorkers) * 100;

            // Count active members (members who have been assigned to tasks in last 30 days)
            const activeMembers = await prisma.taskEmployee.count({
                where: {
                    task: { teamId },
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                },
                distinct: ['accountId']
            });

            return {
                teamId,
                teamName: team.name,
                totalTasks,
                openTasks,
                completedTasks,
                totalMembers,
                activeMembers,
                totalShops,
                checkInRate: Math.round(checkInRate * 100) / 100
            };
        } catch (error) {
            console.error(`[StatisticsService] Error getting team statistics for team ${teamId}:`, error);
            throw new Error('Failed to fetch team statistics');
        }
    }

    /**
     * Get statistics for a specific worker
     */
    async getWorkerStatistics(accountId: number): Promise<WorkerStatistics> {
        try {
            const [account, taskAssignments] = await Promise.all([
                prisma.account.findUnique({
                    where: { id: accountId },
                    select: { name: true }
                }),

                prisma.taskEmployee.findMany({
                    where: {
                        accountId,
                        status: 'APPROVED'
                    },
                    select: {
                        joinedAt: true,
                        leftAt: true,
                        task: {
                            select: {
                                status: true
                            }
                        }
                    }
                })
            ]);

            if (!account) {
                throw new Error('Worker not found');
            }

            const totalTasksAssigned = taskAssignments.length;
            const completedTasks = taskAssignments.filter(t => t.task.status === 'CLOSED').length;
            const cancelledTasks = taskAssignments.filter(t => t.task.status === 'CANCELLED').length;
            const checkInCount = taskAssignments.filter(t => t.joinedAt !== null).length;
            const checkOutCount = taskAssignments.filter(t => t.leftAt !== null).length;

            // Calculate average work hours
            let totalWorkHours = 0;
            let workSessionCount = 0;

            taskAssignments.forEach(assignment => {
                if (assignment.joinedAt && assignment.leftAt) {
                    const hours = (assignment.leftAt.getTime() - assignment.joinedAt.getTime()) / (1000 * 60 * 60);
                    totalWorkHours += hours;
                    workSessionCount++;
                }
            });

            const averageWorkHours = workSessionCount > 0
                ? Math.round((totalWorkHours / workSessionCount) * 100) / 100
                : 0;

            return {
                workerId: accountId,
                workerName: account.name,
                totalTasksAssigned,
                completedTasks,
                cancelledTasks,
                checkInCount,
                checkOutCount,
                averageWorkHours
            };
        } catch (error) {
            console.error(`[StatisticsService] Error getting worker statistics for account ${accountId}:`, error);
            throw new Error('Failed to fetch worker statistics');
        }
    }

    /**
     * Get task statistics for a date range
     */
    async getTaskStatisticsByDateRange(startDate: Date, endDate: Date): Promise<any> {
        try {
            const tasks = await prisma.task.findMany({
                where: {
                    taskDate: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                select: {
                    id: true,
                    status: true,
                    taskDate: true,
                    region: true
                }
            });

            // Group by date
            const tasksByDate: { [key: string]: number } = {};
            tasks.forEach(task => {
                const dateKey = task.taskDate.toISOString().split('T')[0];
                tasksByDate[dateKey] = (tasksByDate[dateKey] || 0) + 1;
            });

            return {
                totalTasks: tasks.length,
                tasksByDate,
                tasksByStatus: tasks.reduce((acc: any, task) => {
                    acc[task.status] = (acc[task.status] || 0) + 1;
                    return acc;
                }, {}),
                tasksByRegion: tasks.reduce((acc: any, task) => {
                    acc[task.region] = (acc[task.region] || 0) + 1;
                    return acc;
                }, {})
            };
        } catch (error) {
            console.error('[StatisticsService] Error getting task statistics by date range:', error);
            throw new Error('Failed to fetch task statistics by date range');
        }
    }
}

export const statisticsService = new StatisticsService();
