import { Router } from 'express';
import { feedbackController } from './controllers/FeedbackController';
import { authController } from './controllers/AuthController';
import { adminController } from './controllers/AdminController';
import { webhookController, githubHmacMiddleware } from './controllers/WebhookController';
import { runsController } from './controllers/RunsController';
import { aiprAuthMiddleware } from './middleware/auth';

const router = Router();

// ===== Public Feedback Routes =====
router.post('/feedback', feedbackController.create.bind(feedbackController));
router.post('/feedback/presign', feedbackController.presign.bind(feedbackController));
router.get('/attachments/:s3Key(*)', feedbackController.getAttachment.bind(feedbackController));

// ===== Public Auth Routes =====
router.post('/auth/login', authController.login.bind(authController));
router.post('/auth/refresh', authController.refresh.bind(authController));

// ===== Public Webhooks =====
router.post('/webhooks/github', githubHmacMiddleware, webhookController.handleGithub.bind(webhookController));

// ===== Protected Admin Routes =====
router.get('/admin/issues', aiprAuthMiddleware, adminController.listIssues.bind(adminController));
router.get('/admin/issues/:id', aiprAuthMiddleware, adminController.getIssue.bind(adminController));
router.patch('/admin/issues/:id', aiprAuthMiddleware, adminController.patchIssue.bind(adminController));

router.get('/admin/origins', aiprAuthMiddleware, adminController.listOrigins.bind(adminController));
router.post('/admin/origins', aiprAuthMiddleware, adminController.addOrigin.bind(adminController));

// SSE logs stream
router.get('/admin/issues/:issueId/logs', aiprAuthMiddleware, runsController.streamLogs.bind(runsController));

export default router;
