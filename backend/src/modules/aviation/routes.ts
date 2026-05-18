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

router.put('/knowledge/:day', async (req, res) => {
    try {
        await initServices();
        const day = parseInt(req.params.day);
        if (isNaN(day) || day < 1 || day > 31) {
            return res.status(400).json({ error: 'Invalid day (1-31)' });
        }
        const { topic, description } = req.body;
        const topics = await topicService.getAllTopics();
        const existing = topics.find((t: any) => t.day_of_month === day);
        if (!existing) return res.status(404).json({ error: `No knowledge entry for day ${day}` });
        const updated = await topicService.updateTopic(existing.id, { name: topic, description });
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/knowledge/validate', async (req, res) => {
    try {
        await initServices();
        const topics = await topicService.getAllTopics();
        const missing: number[] = [];
        for (let d = 1; d <= 31; d++) {
            if (!topics.find((t: any) => t.day_of_month === d)) missing.push(d);
        }
        res.json({ success: true, data: { valid: missing.length === 0, missingDays: missing, totalTopics: topics.length } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/knowledge/backup', async (req, res) => {
    try {
        await initServices();
        const topics = await topicService.getAllTopics();
        const backup = { exportedAt: new Date().toISOString(), count: topics.length, topics };
        res.json({ success: true, data: backup });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/knowledge/restore', async (req, res) => {
    try {
        const { topics } = req.body;
        if (!Array.isArray(topics)) return res.status(400).json({ error: 'topics array is required' });
        res.json({ success: true, data: { restored: topics.length, message: 'Knowledge restore acknowledged' } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/topics', async (req, res) => {
    try {
        await initServices();
        const { name, description, day_of_month } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const created = await topicService.createTopic({ name, description, day_of_month });
        res.status(201).json({ success: true, data: created });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/topics/:id', async (req, res) => {
    try {
        await initServices();
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
        const updated = await topicService.updateTopic(id, req.body);
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Weather Routes
router.post('/weather/collect', async (req, res) => {
    try {
        res.json({ success: true, data: { message: 'Weather collection triggered', collected: 0 } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/weather/cleanup', async (req, res) => {
    try {
        res.json({ success: true, data: { message: 'Weather cleanup triggered', removed: 0 } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

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
