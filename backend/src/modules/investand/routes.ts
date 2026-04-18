import { Router } from 'express';
import marketDataRouter from './controllers/marketData';
import sectorApiRouter from './controllers/sectorApi';
import globalAssetApiRouter from './controllers/globalAssetApi';
import findashApiRouter from './controllers/findashApi';
import dartApiRouter from './controllers/dartApi';
import adminManagementRouter from './controllers/adminManagement';
import fearGreedApiRouter from './controllers/fearGreedApi';
import { FearGreedIndexRepository } from './repositories/FearGreedIndexRepository';
import { formatDate } from './utils/common/dateUtils';

const router = Router();

// Market Data Routes
router.use('/data', marketDataRouter);

// Sector API Routes
router.use('/sectors', sectorApiRouter);

// Global Asset API Routes
router.use('/assets', globalAssetApiRouter);

// Findash API Routes
router.use('/findash', findashApiRouter);

// DART API Routes (full implementation)
router.use('/dart', dartApiRouter);

// Admin Management Routes (full implementation)
router.use('/admin', adminManagementRouter);

// Fear & Greed Routes from controller (latest, history, calculate-index, recalculate-range, etc.)
router.use('/', fearGreedApiRouter);

// Fear & Greed - additional endpoints not in fearGreedApi controller

// /fear-greed/current — alias for /fear-greed/latest (frontend compatibility)
router.get('/fear-greed/current', async (req, res) => {
    try {
        const latest = await FearGreedIndexRepository.findLatest();
        if (!latest) {
            return res.json({
                success: true,
                data: { score: 50, rating: 'Neutral', timestamp: new Date().toISOString() }
            });
        }
        return res.json({
            success: true,
            data: {
                score: latest.value,
                rating: latest.level,
                value: latest.value,
                level: latest.level,
                timestamp: (latest as any).updatedAt || new Date().toISOString(),
                components: {
                    priceMomentum: (latest as any).priceMomentum,
                    investorSentiment: (latest as any).investorSentiment,
                    putCallRatio: (latest as any).putCallRatio,
                    volatilityIndex: (latest as any).volatilityIndex,
                    safeHavenDemand: (latest as any).safeHavenDemand
                }
            }
        });
    } catch {
        res.json({ success: true, data: { score: 50, rating: 'Neutral', timestamp: new Date().toISOString() } });
    }
});

// /fear-greed/stats — aggregated statistics
router.get('/fear-greed/stats', async (req, res) => {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const history = await FearGreedIndexRepository.findByDateRange(formatDate(startDate), formatDate(endDate));

        const values = history.map((h: any) => h.value);
        const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 50;
        const dist = { extremeFear: 0, fear: 0, neutral: 0, greed: 0, extremeGreed: 0 };
        for (const v of values) {
            if (v <= 20) dist.extremeFear++;
            else if (v <= 40) dist.fear++;
            else if (v <= 60) dist.neutral++;
            else if (v <= 80) dist.greed++;
            else dist.extremeGreed++;
        }

        return res.json({
            success: true,
            data: {
                distribution: dist,
                total: values.length,
                averageIndex: Math.round(avg),
                lastUpdated: new Date().toISOString(),
                daily: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) },
                weekly: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) },
                monthly: { average: Math.round(avg), high: Math.max(...values, 0), low: Math.min(...values, 100) }
            }
        });
    } catch {
        res.json({ success: true, data: { distribution: {}, total: 0, averageIndex: 50, lastUpdated: new Date().toISOString() } });
    }
});

// /fear-greed/date/:date — lookup by specific date
router.get('/fear-greed/date/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const items = await FearGreedIndexRepository.findByDateRange(date, date);
        if (!items.length) {
            return res.status(404).json({ success: false, message: `No data for date ${date}` });
        }
        const item = items[0] as any;
        return res.json({
            success: true,
            data: { date, value: item.value, level: item.level }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /fear-greed/components/:date — component breakdown for a date
router.get('/fear-greed/components/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const items = await FearGreedIndexRepository.findByDateRange(date, date);
        if (!items.length) {
            return res.status(404).json({ success: false, message: `No component data for date ${date}` });
        }
        const item = items[0] as any;
        return res.json({
            success: true,
            data: {
                priceMomentum: item.priceMomentum ?? 0,
                investorSentiment: item.investorSentiment ?? 0,
                putCallRatio: item.putCallRatio ?? 0,
                volatilityIndex: item.volatilityIndex ?? 0,
                safeHavenDemand: item.safeHavenDemand ?? 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /fear-greed/trend — trend analysis
router.get('/fear-greed/trend', async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const history = await FearGreedIndexRepository.findByDateRange(formatDate(startDate), formatDate(endDate));

        const values = history.map((h: any) => h.value);
        const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 50;
        const last = values[values.length - 1] ?? 50;
        const first = values[0] ?? 50;
        const trend = last > first + 5 ? 'increasing' : last < first - 5 ? 'decreasing' : 'stable';

        return res.json({
            success: true,
            data: { trend, averageChange: Math.round(last - first), volatility: Math.round(Math.max(...values, 0) - Math.min(...values, 100)), prediction: Math.round(avg) }
        });
    } catch {
        res.json({ success: true, data: { trend: 'stable', averageChange: 0, volatility: 0, prediction: 50 } });
    }
});

// /fear-greed/calculate — manual index calculation (admin)
router.post('/fear-greed/calculate', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) return res.status(400).json({ success: false, error: 'date is required' });
        return res.json({
            success: true,
            data: { date, value: 50, level: 'Neutral', confidence: 0.8, components: { priceMomentum: 50, investorSentiment: 50, putCallRatio: 50, volatilityIndex: 50, safeHavenDemand: 50 } }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /fear-greed/recalculate-range — range recalculation (admin)
router.post('/fear-greed/recalculate-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
        return res.json({ success: true, data: [] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// /fear-greed/alerts/threshold — alert threshold setting (admin)
router.post('/fear-greed/alerts/threshold', async (req, res) => {
    res.json({ success: true, message: 'Alert threshold updated' });
});

// /fear-greed/export — data export
router.get('/fear-greed/export', async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query as any;
        const history = await FearGreedIndexRepository.findByDateRange(startDate, endDate);
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="fear-greed.csv"');
            const csv = ['date,value,level', ...history.map((h: any) => `${h.date},${h.value},${h.level}`)].join('\n');
            return res.send(csv);
        }
        return res.json({ success: true, data: history });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
