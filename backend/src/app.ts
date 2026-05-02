import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import routes from './routes';
import { webSocketService } from './modules/workschd/services/WebSocketService';
import { startWorkschdScraperScheduler } from './modules/workschd/scraper/scheduler';

// Load environment variables from .env.local (priority) or .env (fallback)
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 9002;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize WebSocket service
webSocketService.initialize(httpServer);
startWorkschdScraperScheduler();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:9003')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // server-to-server / curl
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server initialized on port ${PORT}`);
});
