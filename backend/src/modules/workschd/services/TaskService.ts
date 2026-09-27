import { HttpStatus, Injectable } from '@nestjs/common';
import { I18nHttpException } from '../../common/i18n-http.exception';
import { Task, TaskEmployee } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { NotificationService } from './NotificationService';

@Injectable()
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
            try {
                await this.notificationService.sendTaskCreatedNotification(task.id);
            } catch (error) {
                console.error('[TaskService] Failed to send task created notification:', error);
            }
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
                try {
                    await this.notificationService.sendTaskCreatedNotification(task.id);
                } catch (error) {
                    console.error('[TaskService] Failed to send task created notification:', error);
                }
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
        const size = Math.max(params?.size || 10, 1); // Ensure size is at least 1

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
    async updateTask(id: number, data: any): Promise<Task> {
        return await prisma.task.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                workerCount: data.workerCount,
                startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
                endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
                status: data.status,
                shopId: data.shopId
            },
            include: {
                shop: true,
                team: true
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
            throw new I18nHttpException('workschd.task.alreadyApplied', HttpStatus.CONFLICT);
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            throw new I18nHttpException('workschd.task.funeralNotFound', HttpStatus.NOT_FOUND);
        }

        if (task.status !== 'OPEN') {
            throw new I18nHttpException('workschd.task.funeralClosed', HttpStatus.BAD_REQUEST);
        }

        if (task.currentWorkerCount >= task.workerCount) {
            throw new I18nHttpException('workschd.task.capacityFull', HttpStatus.BAD_REQUEST);
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
            try {
                await this.notificationService.sendJoinRequestNotification(taskId, accountId);
            } catch (error) {
                console.error('[TaskService] Failed to send join request notification:', error);
            }
        });

        return taskEmployee;
    }

    /**
     * 참여 신청 승인 (인원 마감 체크 포함)
     */
    async approveJoinRequest(requestId: number): Promise<TaskEmployee> {
        return await prisma.$transaction(async (tx) => {
            const pending = await tx.taskEmployee.findUnique({
                where: { id: requestId },
            });

            if (!pending || pending.status !== 'PENDING') {
                throw new I18nHttpException('workschd.task.approvePendingOnly', HttpStatus.BAD_REQUEST);
            }

            const task = await tx.task.findUnique({
                where: { id: pending.taskId },
            });

            if (!task) {
                throw new I18nHttpException('workschd.task.funeralNotFound', HttpStatus.NOT_FOUND);
            }

            const approvedCount = await tx.taskEmployee.count({
                where: { taskId: pending.taskId, status: 'APPROVED' },
            });

            if (approvedCount >= task.workerCount) {
                throw new I18nHttpException('workschd.task.capacityFull', HttpStatus.BAD_REQUEST);
            }

            const taskEmployee = await tx.taskEmployee.update({
                where: { id: requestId },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date()
                }
            });

            const updatedTask = await tx.task.update({
                where: { id: taskEmployee.taskId },
                data: {
                    currentWorkerCount: { increment: 1 }
                }
            });

            // 승인 알림
            setImmediate(async () => {
                try {
                    await this.notificationService.sendJoinApprovedNotification(
                        taskEmployee.accountId,
                        task.id
                    );
                } catch (error) {
                    console.error('[TaskService] Failed to send join approved notification:', error);
                }
            });

            // 인원 마감 체크
            if (updatedTask.currentWorkerCount >= updatedTask.workerCount) {
                await tx.task.update({
                    where: { id: updatedTask.id },
                    data: { status: 'CLOSED' }
                });

                // 마감 알림
                setImmediate(async () => {
                    try {
                        await this.notificationService.sendTaskClosedNotification(updatedTask.id);
                    } catch (error) {
                        console.error('[TaskService] Failed to send task closed notification:', error);
                    }
                });
            }

            return taskEmployee;
        });
    }

    /**
     * 참여 신청 거절
     */
    async rejectJoinRequest(requestId: number): Promise<TaskEmployee> {
        const taskEmployee = await prisma.taskEmployee.update({
            where: { id: requestId },
            data: { status: 'REJECTED' }
        });

        // 거절 알림
        setImmediate(async () => {
            try {
                await this.notificationService.sendJoinRejectedNotification(
                    taskEmployee.accountId,
                    taskEmployee.taskId
                );
            } catch (error) {
                console.error('[TaskService] Failed to send join rejected notification:', error);
            }
        });

        return taskEmployee;
    }

    /**
     * 참여 신청 취소 (본인만)
     */
    async cancelJoinRequest(requestId: number, accountId: number): Promise<void> {
        const taskEmployee = await prisma.taskEmployee.findUnique({
            where: { id: requestId }
        });

        if (!taskEmployee) {
            throw new I18nHttpException('workschd.task.joinNotFound', HttpStatus.NOT_FOUND);
        }

        if (taskEmployee.accountId !== accountId) {
            throw new I18nHttpException('workschd.task.forbidden', HttpStatus.FORBIDDEN);
        }

        if (taskEmployee.status !== 'PENDING') {
            throw new I18nHttpException('workschd.task.cancelPendingOnly', HttpStatus.BAD_REQUEST);
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

    /**
     * 체크인 (출근)
     */
    async checkIn(taskEmployeeId: number, accountId: number): Promise<TaskEmployee> {
        const result = await prisma.$transaction(async (tx) => {
            // Read with lock to prevent race condition
            const taskEmployee = await tx.taskEmployee.findUnique({
                where: { id: taskEmployeeId }
            });

            if (!taskEmployee) {
                throw new I18nHttpException('workschd.task.participationNotFound', HttpStatus.NOT_FOUND);
            }

            if (taskEmployee.accountId !== accountId) {
                throw new I18nHttpException('workschd.task.forbidden', HttpStatus.FORBIDDEN);
            }

            if (taskEmployee.status !== 'APPROVED') {
                throw new I18nHttpException('workschd.task.checkInApprovedOnly', HttpStatus.BAD_REQUEST);
            }

            if (taskEmployee.joinedAt) {
                throw new I18nHttpException('workschd.task.alreadyCheckedIn', HttpStatus.BAD_REQUEST);
            }

            // Update within transaction
            return await tx.taskEmployee.update({
                where: { id: taskEmployeeId },
                data: { joinedAt: new Date() }
            });
        });

        // 체크인 알림 전송 (트랜잭션 외부)
        setImmediate(async () => {
            try {
                await this.notificationService.sendCheckInNotification(result.taskId, accountId);
            } catch (error) {
                console.error('[TaskService] Failed to send check-in notification:', error);
            }
        });

        return result;
    }

    /**
     * 체크아웃 (퇴근)
     */
    async checkOut(taskEmployeeId: number, accountId: number): Promise<TaskEmployee> {
        const result = await prisma.$transaction(async (tx) => {
            // Read with lock to prevent race condition
            const taskEmployee = await tx.taskEmployee.findUnique({
                where: { id: taskEmployeeId }
            });

            if (!taskEmployee) {
                throw new I18nHttpException('workschd.task.participationNotFound', HttpStatus.NOT_FOUND);
            }

            if (taskEmployee.accountId !== accountId) {
                throw new I18nHttpException('workschd.task.forbidden', HttpStatus.FORBIDDEN);
            }

            if (taskEmployee.status !== 'APPROVED') {
                throw new I18nHttpException('workschd.task.checkOutApprovedOnly', HttpStatus.BAD_REQUEST);
            }

            if (!taskEmployee.joinedAt) {
                throw new I18nHttpException('workschd.task.checkInFirst', HttpStatus.BAD_REQUEST);
            }

            if (taskEmployee.leftAt) {
                throw new I18nHttpException('workschd.task.alreadyCheckedOut', HttpStatus.BAD_REQUEST);
            }

            // Update within transaction
            return await tx.taskEmployee.update({
                where: { id: taskEmployeeId },
                data: { leftAt: new Date() }
            });
        });

        // 체크아웃 알림 전송 (트랜잭션 외부)
        setImmediate(async () => {
            try {
                await this.notificationService.sendCheckOutNotification(result.taskId, accountId);
            } catch (error) {
                console.error('[TaskService] Failed to send check-out notification:', error);
            }
        });

        return result;
    }

    /**
     * 팀장/관리자가 장례식 완료 처리
     */
    async completeTask(taskId: number, accountId: number, userRoles: string[]): Promise<Task> {
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                team: {
                    include: {
                        teamMembers: true,
                    },
                },
            },
        });

        if (!task) {
            throw new I18nHttpException('workschd.task.funeralNotFound', HttpStatus.NOT_FOUND);
        }

        const isAdmin = userRoles.includes('ADMIN');
        const isTeamLeader = task.team.teamMembers.some(
            (member) => member.accountId === accountId && member.role === 'LEADER',
        );

        if (!isAdmin && !isTeamLeader) {
            throw new I18nHttpException('workschd.task.completeLeadersOnly', HttpStatus.FORBIDDEN);
        }

        return prisma.task.update({
            where: { id: taskId },
            data: { status: 'COMPLETED' },
            include: {
                shop: true,
                team: true,
            },
        });
    }
}
