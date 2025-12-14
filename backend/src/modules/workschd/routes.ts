import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { AccountController } from './controllers/AccountController';
import { TeamController } from './controllers/TeamController';

const router = Router();

const authController = new AuthController();
const accountController = new AccountController();
const teamController = new TeamController();

// Auth Routes
router.post('/auth/login', authController.authenticateUser);
router.post('/auth/signup', accountController.createAccount); // Use createAccount for signup

// Account Routes
router.get('/accounts/:id', accountController.getAccount);
router.post('/accounts', accountController.createAccount);

// Team Routes
router.get('/teams/:id', teamController.getTeam);
// Add other team routes as implemented

export default router;
