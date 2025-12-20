import { Router } from 'express';
import { FindashController } from './controller';

const router = Router();

// GET /api/findash/market/history/:assetId
router.get('/market/history/:assetId', FindashController.getMarketHistory);

export default router;
