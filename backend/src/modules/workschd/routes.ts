import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { AccountController } from './controllers/AccountController';
import { TeamController } from './controllers/TeamController';
import { TaskController } from './controllers/TaskController';
import { ShopController } from './controllers/ShopController';

const router = Router();

const authController = new AuthController();
const accountController = new AccountController();
const teamController = new TeamController();
const taskController = new TaskController();
const shopController = new ShopController();

// Auth Routes
router.post('/auth/login', authController.authenticateUser.bind(authController));
router.post('/auth/signup', accountController.createAccount.bind(accountController));

// Account Routes
router.get('/accounts/:id', accountController.getAccount.bind(accountController));
router.post('/accounts', accountController.createAccount.bind(accountController));

// Team Routes
router.get('/team', (req, res) => {
    // Return empty paginated response for now
    res.json({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: parseInt(req.query.size as string) || 10,
        number: parseInt(req.query.page as string) || 0
    });
});
router.get('/teams/:id', teamController.getTeam.bind(teamController));

// Task Routes
router.post('/task', taskController.createTask.bind(taskController));
router.post('/task/tasks', taskController.createMultipleTasks.bind(taskController));
router.get('/task/:id', taskController.getTaskById.bind(taskController));
router.get('/task', taskController.getAllTasks.bind(taskController));
router.put('/task/:id', taskController.updateTask.bind(taskController));
router.delete('/task/:id', taskController.deleteTask.bind(taskController));
router.post('/task/:taskId/request', taskController.createJoinRequest.bind(taskController));
router.post('/task/request/:requestId/approve', taskController.approveJoinRequest.bind(taskController));

// Shop Routes
router.post('/team/:teamId/shop', shopController.createShop.bind(shopController));
router.get('/team/:teamId/shop/:id', shopController.getShopById.bind(shopController));
router.get('/team/:teamId/shop', shopController.getAllShops.bind(shopController));
router.get('/team/:teamId/shop/active', shopController.getActiveShops.bind(shopController));
router.put('/team/:teamId/shop/:id', shopController.updateShop.bind(shopController));
router.delete('/team/:teamId/shop/:id', shopController.deleteShop.bind(shopController));

export default router;
