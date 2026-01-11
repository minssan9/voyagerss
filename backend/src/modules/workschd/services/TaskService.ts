import { Task, TaskEmployee } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { NotificationService } from './NotificationService';

export class TaskService {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    /**
     * 장례식 생성 (알림 발송 포함)
     */
    async createTask(data: any, createdByAccountId: number): Promise<Task> {
        const task = await prisma.$transaction(async (tx) => {
            const newTask = await tx.task.create({
                data: {
                    title: data.title,
                    description: data.description,
                    workerCount: data.workerCount,
                    currentWorkerCount: 0,
                    startDateTime: new Date(data.startDateTime),
                    endDateTime: new Date(data.endDateTime),
                    status: data.status || 'OPEN',
                    teamId: data.teamId,
                    shopId: data.shopId,
                    createdBy: createdByAccountId
                }
            });

            return newTask;
        });

        // 비동기로 알림 발송
        setImmediate(async () => {
            await this.notificationService.sendTaskCreatedNotification(task.id);
        });

        return task;
    }

    /**
     * 다중 장례식 생성
     */
    async createTasks(dataList: any[], createdByAccountId: number): Promise<Task[]> {
        const tasks: Task[] = [];
        await prisma.$transaction(async (tx: any) => {
            for (const data of dataList) {
                const task = await tx.task.create({
                    data: {
                        title: data.title,
                        description: data.description,
                        workerCount: data.workerCount,
                        currentWorkerCount: 0,
                        startDateTime: new Date(data.startDateTime),
                        endDateTime: new Date(data.endDateTime),
                        status: data.status || 'OPEN',
                        teamId: data.teamId,
                        shopId: data.shopId,
                        createdBy: createdByAccountId
                    }
                });
                tasks.push(task);
            }
        });

        // 각 Task에 대해 알림 발송
        for (const task of tasks) {
            setImmediate(async () => {
                await this.notificationService.sendTaskCreatedNotification(task.id);
            });
        }

        return tasks;
    }

    /**
     * 장례식 상세 조회 (관계 포함)
     */
    async getTaskById(id: number): Promise<Task | null> {
        return await prisma.task.findUnique({
            where: { id },
            include: {
                shop: true,
                team: true,
                taskEmployees: {
                    include: {
                        account: {
                            select: {
                                accountId: true,
                                username: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * 장례식 목록 조회 (페이지네이션 및 필터링)
     */
    async getAllTasks(params?: {
        page?: number;
        size?: number;
        region?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ content: Task[]; totalElements: number; totalPages: number }> {
        const page = params?.page || 0;
        const size = params?.size || 10;

        const where: any = {};

        if (params?.region) {
            where.team = { region: params.region };
        }

        if (params?.status) {
            where.status = params.status;
        }

        if (params?.startDate || params?.endDate) {
            where.startDateTime = {};
            if (params?.startDate) {
                where.startDateTime.gte = params.startDate;
            }
            if (params?.endDate) {
                where.startDateTime.lte = params.endDate;
            }
        }

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    shop: true,
                    team: true
                },
                skip: page * size,
                take: size,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.task.count({ where })
        ]);

        return {
            content: tasks,
            totalElements: total,
            totalPages: Math.ceil(total / size)
        };
    }

    /**
     * 장례식 수정
     */
    async updateTask(id: number, data: any): Promise<void> {
        await prisma.task.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                workerCount: data.workerCount,
                startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
                endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
                status: data.status,
                shopId: data.shopId
            }
        });
    }

    /**
     * 장례식 삭제
     */
    async deleteTask(id: number): Promise<void> {
        await prisma.task.delete({
            where: { id }
        });
    }

    /**
     * 참여 신청
     */
    async createJoinRequest(taskId: number, accountId: number): Promise<TaskEmployee> {
        const existing = await prisma.taskEmployee.findFirst({
            where: { taskId, accountId }
        });

        if (existing) {
            throw new Error('이미 참여 신청했습니다');
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            throw new Error('장례식을 찾을 수 없습니다');
        }

        if (task.status !== 'OPEN') {
            throw new Error('마감된 장례식입니다');
        }

        if (task.currentWorkerCount >= task.workerCount) {
            throw new Error('인원이 마감되었습니다');
        }

        const taskEmployee = await prisma.taskEmployee.create({
            data: {
                taskId,
                accountId,
                status: 'PENDING',
                appliedAt: new Date()
            }
        });

        // 팀장에게 알림
        setImmediate(async () => {
            await this.notificationService.sendJoinRequestNotification(taskId, accountId);
        });

        return taskEmployee;
    }

    /**
     * 참여 신청 승인 (인원 마감 체크 포함)
     */
    async approveJoinRequest(requestId: number): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const taskEmployee = await tx.taskEmployee.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date()
                }
            });

            const task = await tx.task.update({
                where: { id: taskEmployee.taskId },
                data: {
                    currentWorkerCount: { increment: 1 }
                }
            });

            // 승인 알림
            setImmediate(async () => {
                await this.notificationService.sendJoinApprovedNotification(
                    taskEmployee.accountId,
                    task.id
                );
            });

            // 인원 마감 체크
            if (task.currentWorkerCount >= task.workerCount) {
                await tx.task.update({
                    where: { id: task.id },
                    data: { status: 'CLOSED' }
                });

                // 마감 알림
                setImmediate(async () => {
                    await this.notificationService.sendTaskClosedNotification(task.id);
                });
            }
        });
    }

    /**
     * 참여 신청 거절
     */
    async rejectJoinRequest(requestId: number): Promise<void> {
        const taskEmployee = await prisma.taskEmployee.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        });

        // 거절 알림
        setImmediate(async () => {
            await this.notificationService.sendJoinRejectedNotification(
                taskEmployee.accountId,
                taskEmployee.taskId
            );
        });
    }

    /**
     * 참여 신청 취소 (본인만)
     */
    async cancelJoinRequest(requestId: number, accountId: number): Promise<void> {
        const taskEmployee = await prisma.taskEmployee.findUnique({
            where: { id: requestId }
        });

        if (!taskEmployee) {
            throw new Error('참여 신청을 찾을 수 없습니다');
        }

        if (taskEmployee.accountId !== accountId) {
            throw new Error('권한이 없습니다');
        }

        if (taskEmployee.status !== 'PENDING') {
            throw new Error('대기 중인 신청만 취소할 수 있습니다');
        }

        await prisma.taskEmployee.delete({
            where: { id: requestId }
        });
    }

    /**
     * 참여자 목록 조회
     */
    async getTaskEmployees(taskId: number): Promise<TaskEmployee[]> {
        return await prisma.taskEmployee.findMany({
            where: { taskId },
            include: {
                account: {
                    select: {
                        accountId: true,
                        username: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: { appliedAt: 'asc' }
        });
    }
}
