import { Task, TaskEmployee } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';

export class TaskService {
    async createTask(data: any): Promise<Task> {
        return await prisma.task.create({
            data: {
                title: data.title,
                description: data.description,
                workerCount: data.workerCount,
                startDateTime: new Date(data.startDateTime),
                endDateTime: new Date(data.endDateTime),
                status: data.status,
                teamId: data.teamId,
                shopId: data.shopId
            }
        });
    }

    async createTasks(dataList: any[]): Promise<Task[]> {
        // Prisma createMany doesn't return the created objects with IDs easily in one go if we need them back.
        // For simplicity and matching Java's saveMultiple which returns DTOs, we might loop or use transaction.
        // However, standard createMany returns count.
        // Let's loop in transaction to return objects, or just map.

        const tasks: Task[] = [];
        await prisma.$transaction(async (tx) => {
            for (const data of dataList) {
                const task = await tx.task.create({
                    data: {
                        title: data.title,
                        description: data.description,
                        workerCount: data.workerCount,
                        startDateTime: new Date(data.startDateTime),
                        endDateTime: new Date(data.endDateTime),
                        status: data.status,
                        teamId: data.teamId,
                        shopId: data.shopId
                    }
                });
                tasks.push(task);
            }
        });
        return tasks;
    }

    async getTaskById(id: number): Promise<Task | null> {
        return await prisma.task.findUnique({
            where: { id }
        });
    }

    async getAllTasks(): Promise<Task[]> {
        return await prisma.task.findMany();
    }

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
                // teamId usually doesn't change
            }
        });
    }

    async deleteTask(id: number): Promise<void> {
        await prisma.task.delete({
            where: { id }
        });
    }

    async createJoinRequest(taskId: number, accountId: number): Promise<TaskEmployee> {
        // Check if exists
        const existing = await prisma.taskEmployee.findFirst({
            where: {
                taskId,
                accountId
            }
        });

        if (existing) {
            throw new Error('Join request already exists');
        }

        return await prisma.taskEmployee.create({
            data: {
                taskId,
                accountId,
                status: 'PENDING'
            }
        });
    }

    async approveJoinRequest(requestId: number): Promise<void> {
        await prisma.taskEmployee.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED'
            }
        });
    }
}
