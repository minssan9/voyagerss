import { Response } from 'express';
import { statisticsService } from '../services/StatisticsService';
import { AuthRequest } from '../middleware/authMiddleware';

export class StatisticsController {
    /**
     * Get dashboard statistics (Admin only)
     */
    async getDashboardStatistics(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Check if user is admin or team leader
            if (req.user.role !== 'ADMIN' && req.user.role !== 'TEAM_LEADER') {
                res.status(403).json({ message: 'Forbidden: Admin or Team Leader access required' });
                return;
            }

            const statistics = await statisticsService.getDashboardStatistics();
            res.status(200).json(statistics);
        } catch (error: any) {
            console.error('Get dashboard statistics error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get team statistics
     */
    async getTeamStatistics(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const teamId = parseInt(req.params.teamId);

            if (isNaN(teamId)) {
                res.status(400).json({ message: 'Invalid team ID' });
                return;
            }

            // Check if user has access to this team
            // Team leaders can only view their own team stats, admins can view all
            if (req.user.role === 'TEAM_LEADER' && req.user.teamId !== teamId) {
                res.status(403).json({ message: 'Forbidden: Cannot view other team statistics' });
                return;
            }

            const statistics = await statisticsService.getTeamStatistics(teamId);
            res.status(200).json(statistics);
        } catch (error: any) {
            console.error('Get team statistics error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get worker statistics
     */
    async getWorkerStatistics(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const workerId = parseInt(req.params.workerId);

            if (isNaN(workerId)) {
                res.status(400).json({ message: 'Invalid worker ID' });
                return;
            }

            // Workers can view their own stats, team leaders and admins can view their team members' stats
            if (req.user.role === 'HELPER' && req.user.accountId !== workerId) {
                res.status(403).json({ message: 'Forbidden: Cannot view other worker statistics' });
                return;
            }

            const statistics = await statisticsService.getWorkerStatistics(workerId);
            res.status(200).json(statistics);
        } catch (error: any) {
            console.error('Get worker statistics error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get task statistics by date range
     */
    async getTaskStatisticsByDateRange(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const startDateStr = req.query.startDate as string;
            const endDateStr = req.query.endDate as string;

            if (!startDateStr || !endDateStr) {
                res.status(400).json({ message: 'Start date and end date are required' });
                return;
            }

            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                res.status(400).json({ message: 'Invalid date format' });
                return;
            }

            if (startDate > endDate) {
                res.status(400).json({ message: 'Start date must be before end date' });
                return;
            }

            const statistics = await statisticsService.getTaskStatisticsByDateRange(startDate, endDate);
            res.status(200).json(statistics);
        } catch (error: any) {
            console.error('Get task statistics by date range error:', error);
            res.status(500).json({ message: error.message });
        }
    }
}
