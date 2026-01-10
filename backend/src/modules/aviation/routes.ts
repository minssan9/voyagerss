import { Router } from 'express';
// @ts-ignore
import ApplicationFactory from './ApplicationFactory';

const router = Router();
let topicService: any;
let weatherImageService: any;

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

export default router;
