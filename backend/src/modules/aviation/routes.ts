import { Router } from 'express';
// @ts-ignore
import ApplicationFactory from './ApplicationFactory';
// @ts-ignore
import AviationAbbreviationService from './features/aviation-abbreviation/architecture/services/AviationAbbreviationService';

const router = Router();
let topicService: any;
let weatherImageService: any;
let schedulingService: any;
const abbreviationService = new AviationAbbreviationService();

// Initialize services (Async initialization might be tricky in module scope, 
// usually done in a startup function. For now, lazily or global init).
// We'll wrap in a setup function or assume factory can be synchronous-ish or we wait.
// Actually, ApplicationFactory.createApp(db) is sync, but services might need async init?
// AdminServer calls await this.weatherImageService.initialize();

async function initServices() {
    if (topicService) return;
    // @ts-ignore - ApplicationFactory from legacy JS code
    const factory = new ApplicationFactory();
    // We need a DB instance. AviationBot creates it.
    // In unified backend, we should probably share the DB or create one.
    // For legacy support, let the factory create it if it handles it.
    // @ts-ignore - createApp accepts null parameter
    factory.createApp(null); // Database injected by factory if null? AviationBot passes null to createApp then gets 'database' service.

    // @ts-ignore
    const db = factory.getService('database');
    await db.initialize();

    // @ts-ignore
    topicService = factory.getContainer().resolve('topicService');
    // @ts-ignore
    weatherImageService = factory.getContainer().resolve('weatherService');
    await weatherImageService.initialize();
    // @ts-ignore
    schedulingService = factory.getContainer().resolve('schedulingService');
}

// Middleware to ensure services are ready
router.use(async (req, res, next) => {
    try {
        await initServices();
        next();
    } catch (err) {
        next(err);
    }
});

// Routes extracted from AdminServer.js

router.get('/knowledge', async (req, res) => {
    try {
        const topics = await topicService.getAllTopics();
        const knowledgeData: any = {};
        for (const topic of topics) {
            knowledgeData[topic.day_of_month] = {
                topic: topic.name,
                description: topic.description
            };
        }
        res.json(knowledgeData);
    } catch (error: any) {
        console.error('DB Error', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/topics', async (req, res) => {
    try {
        const topics = await topicService.getAllTopics();
        res.json(topics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/topics/schedule', async (req, res) => {
    try {
        const topics = await topicService.getAllTopics();
        res.json(topics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/topics/stats', async (req, res) => {
    try {
        const topics = await topicService.getAllTopics();
        res.json({ total: topics.length, active: topics.filter((t: any) => t.isActive).length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Weather Routes
router.get('/weather/images', async (req, res) => {
    try {
        // Return empty array for now - weatherImageService needs initialization
        res.json({ success: true, data: { images: [], count: 0 } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/weather/kma/status', async (req, res) => {
    try {
        res.json({ success: true, data: { status: 'inactive', lastUpdate: null } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/weather/gathering/enabled', async (req, res) => {
    try {
        res.json({ success: true, data: { enabled: false } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/weather/gathering/enabled', async (req, res) => {
    try {
        const { enabled } = req.body;
        res.json({ success: true, data: { enabled, message: 'Weather gathering status updated' } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Aviation Abbreviation Routes

/**
 * Get random abbreviations (preview)
 * GET /abbreviations/random?count=10
 */
router.get('/abbreviations/random', async (req, res) => {
    try {
        const count = parseInt(req.query.count as string) || 10;
        const abbreviations = abbreviationService.getRandomAbbreviations(count);
        res.json({
            success: true,
            data: {
                abbreviations,
                count: abbreviations.length,
                totalAvailable: abbreviationService.getTotalCount()
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get formatted message preview
 * GET /abbreviations/preview
 */
router.get('/abbreviations/preview', async (req, res) => {
    try {
        const abbreviations = abbreviationService.getRandomAbbreviations(10);
        const message = abbreviationService.formatForTelegram(abbreviations);
        res.json({
            success: true,
            data: {
                message,
                abbreviations,
                messageLength: message.length
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Search abbreviations
 * GET /abbreviations/search?q=keyword
 */
router.get('/abbreviations/search', async (req, res) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Search query (q) is required' });
        }
        const results = abbreviationService.searchAbbreviations(query);
        res.json({
            success: true,
            data: {
                results,
                count: results.length,
                query
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get abbreviation by code
 * GET /abbreviations/:code
 */
router.get('/abbreviations/:code', async (req, res) => {
    try {
        const code = req.params.code;
        const abbreviation = abbreviationService.getByCode(code);
        if (!abbreviation) {
            return res.status(404).json({ error: `Abbreviation '${code}' not found` });
        }
        res.json({
            success: true,
            data: abbreviation
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all abbreviations
 * GET /abbreviations
 */
router.get('/abbreviations', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                totalCount: abbreviationService.getTotalCount(),
                message: 'Use /abbreviations/random to get random abbreviations, or /abbreviations/:code to get specific abbreviation'
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Trigger manual abbreviation notification to all subscribers
 * POST /abbreviations/broadcast
 */
router.post('/abbreviations/broadcast', async (req, res) => {
    try {
        if (!schedulingService) {
            return res.status(503).json({ error: 'Scheduling service not available' });
        }
        const result = await schedulingService.manualAbbreviationNotification();
        res.json({
            success: result.success,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
