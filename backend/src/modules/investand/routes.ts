import { Router } from 'express';
// Legacy imports - needing refactor to relative paths or alias config
// For now assuming these are reachable or will be moved
// In a real migration we would fix these paths. 
// Since we are in legacy_src, we need to point to them.
// But we should move them OUT of legacy_src to structured folders eventually.
// For now, let's just point to legacy_src/routes

import apiRoutes from './controllers/fearGreedApi';
import fearGreedRoutes from './controllers/fearGreedPublic';
import dataRoutes from './controllers/marketData';
import adminRoutes from './controllers/adminManagement';
import dartRoutes from './controllers/dartApiSimple';
import domainRoutes from './controllers/domainApi';
import messagingRoutes from './controllers/messagingApi';
import telegramWebhookRoutes from './controllers/telegramWebhook';
import findashRoutes from './controllers/findashApi';

import { initializeInvestand } from './init';

const router = Router();

// Initialize module services/schedulers
initializeInvestand();

router.use('/', apiRoutes);
router.use('/fear-greed', fearGreedRoutes);
router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/dart', dartRoutes);
router.use('/domain', domainRoutes);
router.use('/messaging', messagingRoutes);
router.use('/telegram', telegramWebhookRoutes);
router.use('/findash', findashRoutes);

export default router;
