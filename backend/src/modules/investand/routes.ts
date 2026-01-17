import { Router } from 'express';
import marketDataRouter from './controllers/marketData';
import sectorApiRouter from './controllers/sectorApi';
import globalAssetApiRouter from './controllers/globalAssetApi';

const router = Router();

// Market Data Routes
router.use('/data', marketDataRouter);

// Sector API Routes
router.use('/sectors', sectorApiRouter);

// Global Asset API Routes
router.use('/assets', globalAssetApiRouter);

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


// Fear & Greed Routes
router.get('/fear-greed/current', (req, res) => {
    res.json({
        success: true,
        data: {
            score: 45,
            rating: 'Neutral',
            timestamp: new Date().toISOString()
        }
    });
});

router.get('/fear-greed/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            daily: { average: 50, high: 60, low: 40 },
            weekly: { average: 52, high: 65, low: 35 },
            monthly: { average: 48, high: 70, low: 30 }
        }
    });
});

router.get('/fear-greed/history', (req, res) => {
    const days = parseInt(req.query.days as string) || 30;
    const history = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        score: Math.floor(Math.random() * 100)
    }));
    res.json({ success: true, count: days, data: history });
});

// Stock Data Routes
router.get('/data/kospi', (req, res) => {
    res.json({
        success: true,
        data: {
            index: 2500.50,
            change: 15.20,
            percentChange: 0.61,
            volume: 5000000,
            timestamp: new Date().toISOString()
        }
    });
});

router.get('/data/kosdaq', (req, res) => {
    res.json({
        success: true,
        data: {
            index: 850.30,
            change: -5.10,
            percentChange: -0.60,
            volume: 2000000,
            timestamp: new Date().toISOString()
        }
    });
});

router.get('/dart/health', (req, res) => {
    res.json({ success: true, status: 'HEALTHY', message: 'DART service operating normally' });
});

export default router;
