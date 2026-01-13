import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import routes from './routes';
import { webSocketService } from './modules/workschd/services/WebSocketService';

// Load environment variables from .env.local (priority) or .env (fallback)
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 6172;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize WebSocket service
webSocketService.initialize(httpServer);

app.use(cors());
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
