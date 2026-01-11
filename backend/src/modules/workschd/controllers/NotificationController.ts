import { Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { AuthRequest } from '../middleware/authMiddleware';

const notificationService = new NotificationService();

export class NotificationController {
    /**
     * 알림 목록 조회
     */
    async getNotifications(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const page = req.query.page ? parseInt(req.query.page as string) : 0;
            const size = req.query.size ? parseInt(req.query.size as string) : 10;
            const type = req.query.type as string | undefined;
            const status = req.query.status as string | undefined;

            const result = await notificationService.getNotifications({
                accountId: req.user.accountId,
                page,
                size,
                type,
                status
            });

            res.status(200).json(result);
        } catch (error: any) {
            console.error('Get notifications error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 알림 읽음 처리
     */
    async markAsRead(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const notificationId = parseInt(req.params.id);
            const success = await notificationService.markAsRead(
                notificationId,
                req.user.accountId
            );

            if (!success) {
                res.status(404).json({ message: 'Notification not found or unauthorized' });
                return;
            }

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Mark as read error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * 알림 삭제
     */
    async deleteNotification(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const notificationId = parseInt(req.params.id);
            const success = await notificationService.deleteNotification(
                notificationId,
                req.user.accountId
            );

            if (!success) {
                res.status(404).json({ message: 'Notification not found or unauthorized' });
                return;
            }

            res.status(200).json({ success: true });
        } catch (error: any) {
            console.error('Delete notification error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}
