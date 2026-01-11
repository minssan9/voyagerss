import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { AccountController } from './controllers/AccountController';
import { TeamController } from './controllers/TeamController';
import { TaskController } from './controllers/TaskController';
import { ShopController } from './controllers/ShopController';
import { NotificationController } from './controllers/NotificationController';
import {
    authenticate,
    isTeamLeader,
    isHelper,
    isTaskOwner
} from './middleware/authMiddleware';

const router = Router();

const authController = new AuthController();
const accountController = new AccountController();
const teamController = new TeamController();
const taskController = new TaskController();
const shopController = new ShopController();
const notificationController = new NotificationController();

// ===== Auth Routes (Public) =====
router.post('/auth/login', authController.authenticateUser.bind(authController));
router.post('/auth/signup', accountController.createAccount.bind(accountController));

// OAuth2 Routes
router.get('/auth/google', authController.googleAuth.bind(authController));
router.get('/auth/google/callback', authController.googleCallback.bind(authController));
router.get('/auth/kakao', authController.kakaoAuth.bind(authController));
router.get('/auth/kakao/callback', authController.kakaoCallback.bind(authController));

// ===== Account Routes =====
router.get('/accounts/:id', authenticate, accountController.getAccount.bind(accountController));
router.post('/accounts', accountController.createAccount.bind(accountController));

// ===== Team Routes =====
router.get('/team', authenticate, (req, res) => {
    // Return empty paginated response for now
    res.json({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: parseInt(req.query.size as string) || 10,
        number: parseInt(req.query.page as string) || 0
    });
});
router.get('/teams/:id', authenticate, teamController.getTeam.bind(teamController));

// ===== Task Routes =====
// 생성 (팀장만)
router.post('/task', authenticate, isTeamLeader, taskController.createTask.bind(taskController));
router.post('/task/tasks', authenticate, isTeamLeader, taskController.createMultipleTasks.bind(taskController));

// 조회 (인증 사용자)
router.get('/task/:id', authenticate, taskController.getTaskById.bind(taskController));
router.get('/task', authenticate, taskController.getAllTasks.bind(taskController));

// 수정/삭제 (작성자 또는 ADMIN)
router.put('/task/:id', authenticate, isTeamLeader, isTaskOwner, taskController.updateTask.bind(taskController));
router.delete('/task/:id', authenticate, isTeamLeader, isTaskOwner, taskController.deleteTask.bind(taskController));

// 참여자 목록 (팀장만)
router.get('/task/:id/employees', authenticate, isTeamLeader, taskController.getTaskEmployees.bind(taskController));

// 참여 신청 (도우미)
router.post('/task/:taskId/request', authenticate, isHelper, taskController.createJoinRequest.bind(taskController));

// 참여 승인/거절 (팀장만)
router.post('/task/request/:requestId/approve', authenticate, isTeamLeader, taskController.approveJoinRequest.bind(taskController));
router.post('/task/request/:requestId/reject', authenticate, isTeamLeader, taskController.rejectJoinRequest.bind(taskController));

// 참여 취소 (본인만)
router.delete('/task/request/:requestId', authenticate, taskController.cancelJoinRequest.bind(taskController));

// ===== Notification Routes =====
router.get('/notifications', authenticate, notificationController.getNotifications.bind(notificationController));
router.get('/notifications/unread/count', authenticate, notificationController.getUnreadCount.bind(notificationController));
router.put('/notifications/:id/read', authenticate, notificationController.markAsRead.bind(notificationController));
router.put('/notifications/mark-all-read', authenticate, notificationController.markAllAsRead.bind(notificationController));
router.delete('/notifications/:id', authenticate, notificationController.deleteNotification.bind(notificationController));

// ===== Shop Routes =====
router.post('/team/:teamId/shop', authenticate, isTeamLeader, shopController.createShop.bind(shopController));
router.get('/team/:teamId/shop/:id', authenticate, shopController.getShopById.bind(shopController));
router.get('/team/:teamId/shop', authenticate, shopController.getAllShops.bind(shopController));
router.get('/team/:teamId/shop/active', authenticate, shopController.getActiveShops.bind(shopController));
router.put('/team/:teamId/shop/:id', authenticate, isTeamLeader, shopController.updateShop.bind(shopController));
router.delete('/team/:teamId/shop/:id', authenticate, isTeamLeader, shopController.deleteShop.bind(shopController));

export default router;
