import { Router } from 'express';
import { feedbackController } from './controllers/FeedbackController';
import { authController } from './controllers/AuthController';
import { adminController } from './controllers/AdminController';
import { webhookController, githubHmacMiddleware, gitlabTokenMiddleware } from './controllers/WebhookController';
import { runsController } from './controllers/RunsController';
import { aiprAuthMiddleware } from './middleware/auth';
import { aiprSystemConfigController } from './controllers/AiprSystemConfigController';
import { gitProviderController } from './controllers/GitProviderController';
import { repositoriesController } from './controllers/RepositoriesController';
import { gitIssuesController } from './controllers/GitIssuesController';

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
router.post('/webhooks/gitlab', gitlabTokenMiddleware, webhookController.handleGitlab.bind(webhookController));

// ===== Protected Admin Routes =====
router.get('/admin/issues', aiprAuthMiddleware, adminController.listIssues.bind(adminController));
router.get('/admin/issues/:id', aiprAuthMiddleware, adminController.getIssue.bind(adminController));
router.patch('/admin/issues/:id', aiprAuthMiddleware, adminController.patchIssue.bind(adminController));

router.get('/admin/origins', aiprAuthMiddleware, adminController.listOrigins.bind(adminController));
router.post('/admin/origins', aiprAuthMiddleware, adminController.addOrigin.bind(adminController));

// SSE logs stream
router.get('/admin/issues/:issueId/logs', aiprAuthMiddleware, runsController.streamLogs.bind(runsController));

// ===== Protected Config Routes =====
router.get('/admin/config/categories', aiprAuthMiddleware, aiprSystemConfigController.getCategories.bind(aiprSystemConfigController));
router.get('/admin/config', aiprAuthMiddleware, aiprSystemConfigController.listConfigs.bind(aiprSystemConfigController));
router.post('/admin/config/reload', aiprAuthMiddleware, aiprSystemConfigController.reloadConfigs.bind(aiprSystemConfigController));
router.get('/admin/config/:key', aiprAuthMiddleware, aiprSystemConfigController.getConfig.bind(aiprSystemConfigController));
router.put('/admin/config/:key', aiprAuthMiddleware, aiprSystemConfigController.upsertConfig.bind(aiprSystemConfigController));
router.delete('/admin/config/:key', aiprAuthMiddleware, aiprSystemConfigController.deleteConfig.bind(aiprSystemConfigController));

// ===== Git Providers =====
router.get('/admin/providers', aiprAuthMiddleware, gitProviderController.list.bind(gitProviderController));
router.post('/admin/providers', aiprAuthMiddleware, gitProviderController.create.bind(gitProviderController));
router.patch('/admin/providers/:id', aiprAuthMiddleware, gitProviderController.update.bind(gitProviderController));
router.delete('/admin/providers/:id', aiprAuthMiddleware, gitProviderController.remove.bind(gitProviderController));
router.post('/admin/providers/:id/test', aiprAuthMiddleware, gitProviderController.testConnection.bind(gitProviderController));

// ===== Repositories =====
router.get('/admin/providers/:providerId/repos', aiprAuthMiddleware, repositoriesController.list.bind(repositoriesController));
router.post('/admin/providers/:providerId/repos/sync', aiprAuthMiddleware, repositoriesController.sync.bind(repositoriesController));
router.patch('/admin/providers/:providerId/repos/:repoId/auto-pilot', aiprAuthMiddleware, repositoriesController.patchAutoPilot.bind(repositoriesController));

// ===== Git Issues =====
router.get('/admin/repos/:repoId/issues', aiprAuthMiddleware, gitIssuesController.listRemote.bind(gitIssuesController));
router.post('/admin/repos/:repoId/issues/:num/import', aiprAuthMiddleware, gitIssuesController.importIssue.bind(gitIssuesController));

export default router;
