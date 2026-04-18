import { Router } from 'express';
import express from 'express';
import issueRouter from './controllers/IssueController';
import jobRouter from './controllers/JobController';
import todoRouter from './controllers/TodoController';
import webhookRouter from './controllers/WebhookController';
import settingsRouter from './controllers/SettingsController';
import { startDailyResolveScheduler } from './schedulers/dailyResolve';
import { startJiraSyncScheduler } from './schedulers/jiraSync';
import { startWorktreeCleanupScheduler } from './schedulers/worktreeCleanup';

// Start schedulers when this module is loaded
startDailyResolveScheduler();
startJiraSyncScheduler();
startWorktreeCleanupScheduler();

const router = Router();

router.use('/issues', issueRouter);
router.use('/jobs', jobRouter);
router.use('/todos', todoRouter);

// Bitbucket webhooks need raw body for HMAC — apply before JSON parsing
router.use(
  '/webhooks/bitbucket',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    // Stash raw body so WebhookController can access it
    (req as any).rawBody = req.body;
    next();
  },
);
router.use('/webhooks', webhookRouter);

router.use('/settings', settingsRouter);

export default router;
