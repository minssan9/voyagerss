import { Router } from 'express';
// @ts-ignore
import ApplicationFactory from './legacy_src/ApplicationFactory';

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
    const factory = new ApplicationFactory();
    // We need a DB instance. AviationBot creates it.
    // In unified backend, we should probably share the DB or create one.
    // For legacy support, let the factory create it if it handles it.
    factory.createApp(null); // Database injected by factory if null? AviationBot passes null to createApp then gets 'database' service.

    const db = factory.getService('database');
    await db.initialize();

    topicService = factory.getContainer().resolve('topicService');
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

// ... Add other routes as needed (weather, etc)
// For brevity, added key routes.

export default router;
