import { Response } from 'express';
import { TaskService } from '../services/TaskService';
import { AuthRequest } from '../middleware/authMiddleware';

const taskService = new TaskService();

export class TaskController {
    /**
     * 장례식 생성 (팀장만)
     */
    async createTask(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const task = await taskService.createTask(req.body, req.user.accountId);
            res.status(201).json(task);
        } catch (error: any) {
            console.error('Create task error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 다중 장례식 생성 (팀장만)
     */
    async createMultipleTasks(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const tasks = await taskService.createTasks(req.body, req.user.accountId);
            res.status(201).json(tasks);
        } catch (error: any) {
            console.error('Create multiple tasks error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 장례식 상세 조회
     */
    async getTaskById(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            const task = await taskService.getTaskById(id);

            if (!task) {
                res.status(404).json({ message: 'Task not found' });
                return;
            }

            res.status(200).json(task);
        } catch (error: any) {
            console.error('Get task by id error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 장례식 목록 조회 (페이지네이션 및 필터링)
     */
    async getAllTasks(req: AuthRequest, res: Response): Promise<void> {
        try {
            const page = req.query.page ? parseInt(req.query.page as string) : 0;
            const size = req.query.size ? parseInt(req.query.size as string) : 10;
            const region = req.query.region as string;
            const status = req.query.status as string;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            const result = await taskService.getAllTasks({
                page,
                size,
                region,
                status,
                startDate,
                endDate
            });

            res.status(200).json(result);
        } catch (error: any) {
            console.error('Get all tasks error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 장례식 수정 (작성자 또는 ADMIN만)
     */
    async updateTask(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            await taskService.updateTask(id, req.body);
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Update task error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 장례식 삭제 (작성자 또는 ADMIN만)
     */
    async deleteTask(req: AuthRequest, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            await taskService.deleteTask(id);
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Delete task error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 참여 신청 (도우미)
     */
    async createJoinRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const taskId = parseInt(req.params.taskId);
            const request = await taskService.createJoinRequest(taskId, req.user.accountId);
            res.status(201).json(request);
        } catch (error: any) {
            console.error('Create join request error:', error);

            if (error.message === '이미 참여 신청했습니다') {
                res.status(409).json({ message: error.message });
                return;
            }
            if (error.message === '마감된 장례식입니다' || error.message === '인원이 마감되었습니다') {
                res.status(400).json({ message: error.message });
                return;
            }

            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 참여 신청 승인 (팀장만)
     */
    async approveJoinRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            const requestId = parseInt(req.params.requestId);
            await taskService.approveJoinRequest(requestId);
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Approve join request error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 참여 신청 거절 (팀장만)
     */
    async rejectJoinRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            const requestId = parseInt(req.params.requestId);
            await taskService.rejectJoinRequest(requestId);
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Reject join request error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 참여 신청 취소 (본인만)
     */
    async cancelJoinRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const requestId = parseInt(req.params.requestId);
            await taskService.cancelJoinRequest(requestId, req.user.accountId);
            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Cancel join request error:', error);

            if (error.message === '권한이 없습니다') {
                res.status(403).json({ message: error.message });
                return;
            }
            if (error.message === '대기 중인 신청만 취소할 수 있습니다') {
                res.status(400).json({ message: error.message });
                return;
            }

            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 참여자 목록 조회 (팀장만)
     */
    async getTaskEmployees(req: AuthRequest, res: Response): Promise<void> {
        try {
            const taskId = parseInt(req.params.id);
            const employees = await taskService.getTaskEmployees(taskId);
            res.status(200).json(employees);
        } catch (error: any) {
            console.error('Get task employees error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}
