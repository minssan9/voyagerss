import { Router } from 'express';
import marketDataRouter from './controllers/marketData';
import sectorApiRouter from './controllers/sectorApi';

const router = Router();

// Market Data Routes
router.use('/data', marketDataRouter);

// Sector API Routes
router.use('/sectors', sectorApiRouter);

// Dart API Routes - stub implementations
router.get('/dart/stats', (req, res) => {
    res.json({ success: true, data: { totalDisclosures: 0, lastUpdate: null } });
});

router.get('/dart/disclosures', (req, res) => {
    res.json({ success: true, data: { items: [], total: 0, page: 1, limit: 50 } });
});

router.get('/dart/batch/status', (req, res) => {
    res.json({ success: true, data: { status: 'idle', lastRun: null, nextRun: null } });
});

// Admin API Routes - stub implementations
router.get('/admin/system-health', (req, res) => {
    res.json({
        success: true,
        data: {
            database: { status: 'HEALTHY', responseTime: 45, connections: 5 },
            api: { status: 'HEALTHY', responseTime: 12, uptime: '2h 30m' },
            dataCollection: { lastRun: new Date().toISOString(), status: 'IDLE', successRate: 95 }
        }
    });
});

router.get('/admin/performance-metrics', (req, res) => {
    res.json({
        success: true,
        data: {
            cpu: 23.5,
            memory: 45.2,
            diskUsage: 67.8,
            networkIO: { inbound: 1024, outbound: 2048 }
        }
    });
});

export default router;
