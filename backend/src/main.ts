import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { configService } from './config/config-service';
import { webSocketService } from './modules/workschd/services/WebSocketService';
import { startWorkschdScraperScheduler } from './modules/workschd/scraper/scheduler';
import { resolveBackendHost, resolveBackendPort, TRUST_PROXY_HOPS } from './server-config';

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });

  // Load config from DB before CORS setup (CORS reads ALLOWED_ORIGINS at request time,
  // but initialize() ensures the cache is populated first)
  await configService.initialize();

  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.set('trust proxy', TRUST_PROXY_HOPS);

  // CORS must be registered before legacy route handlers
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const rawOrigins = configService.get('ALLOWED_ORIGINS', 'http://localhost:9003')!;
      const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin);
      callback(isAllowed ? null : new Error(`CORS: origin "${origin}" not allowed`), isAllowed);
    },
    credentials: true,
  });
  app.use(helmet());

  // workschd: migrated to NestJS WorkschdModule
  // investand: migrated to NestJS InvestandModule
  // aviation: migrated to NestJS AviationModule

  expressInstance.get('/health', (_: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Global prefix applies to future NestJS @Controller() routes
  app.setGlobalPrefix('api');

  // WebSocket — must use NestJS-managed HTTP server, not a separately created server
  const httpServer = app.getHttpServer();
  webSocketService.initialize(httpServer);

  startWorkschdScraperScheduler();

  const PORT = resolveBackendPort();
  const HOST = resolveBackendHost();

  await app.listen(PORT, HOST);
  console.log(`[NestJS] Server running on ${HOST}:${PORT}`);
  console.log(`[NestJS] WebSocket initialized on port ${PORT}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
