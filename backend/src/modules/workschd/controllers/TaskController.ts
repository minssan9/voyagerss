import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';

const taskService = new TaskService();

export class TaskController {
    async createTask(req: Request, res: Response) {
        try {
            const task = await taskService.createTask(req.body);
            res.status(200).json(task);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async createMultipleTasks(req: Request, res: Response) {
        try {
            const tasks = await taskService.createTasks(req.body);
            res.status(200).json(tasks);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getTaskById(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const task = await taskService.getTaskById(id);
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }
            res.status(200).json(task);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAllTasks(req: Request, res: Response) {
        try {
            const tasks = await taskService.getAllTasks();
            res.status(200).json(tasks);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateTask(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            await taskService.updateTask(id, req.body);
            res.status(200).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteTask(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            await taskService.deleteTask(id);
            res.status(200).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async createJoinRequest(req: Request, res: Response) {
        try {
            const taskId = Number(req.params.taskId);
            const accountId = Number(req.query.accountId); // or req.body.accountId

            const request = await taskService.createJoinRequest(taskId, accountId);
            res.status(200).json(request);
        } catch (error: any) {
            if (error.message === 'Join request already exists') {
                return res.status(409).send();
            }
            res.status(500).json({ message: error.message });
        }
    }

    async approveJoinRequest(req: Request, res: Response) {
        try {
            const requestId = Number(req.params.requestId);
            await taskService.approveJoinRequest(requestId);
            res.status(200).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}
