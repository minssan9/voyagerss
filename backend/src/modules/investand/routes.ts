import { Router } from 'express';
// Legacy imports - needing refactor to relative paths or alias config
// For now assuming these are reachable or will be moved
// In a real migration we would fix these paths. 
// Since we are in legacy_src, we need to point to them.
// But we should move them OUT of legacy_src to structured folders eventually.
// For now, let's just point to legacy_src/routes

import apiRoutes from './legacy_src/routes/fearGreedApi'; // Adapting path
import fearGreedRoutes from './legacy_src/routes/fearGreedPublic';
import dataRoutes from './legacy_src/routes/marketData';
import adminRoutes from './legacy_src/routes/adminManagement';
import dartRoutes from './legacy_src/routes/dartApiSimple';
import domainRoutes from './legacy_src/routes/domainApi';
import messagingRoutes from './legacy_src/routes/messagingApi';
import telegramWebhookRoutes from './legacy_src/routes/telegramWebhook';

const router = Router();

router.use('/', apiRoutes);
router.use('/fear-greed', fearGreedRoutes);
router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/dart', dartRoutes);
router.use('/domain', domainRoutes);
router.use('/messaging', messagingRoutes);
router.use('/telegram', telegramWebhookRoutes);

export default router;
