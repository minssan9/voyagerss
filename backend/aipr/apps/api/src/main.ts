import { initTelemetry } from '@repo/shared';
initTelemetry('auto-pr-api'); // must be first

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: false });

  // Capture raw body for GitHub webhook HMAC verification
  adapter.getInstance().addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: any, body: Buffer, done: (err: null, body: unknown) => void) => {
      (req as any).rawBody = body;
      done(null, JSON.parse(body.toString('utf8')));
    },
  );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.WIDGET_ORIGIN_ALLOWLIST ?? '').split(',').map((o) => o.trim()),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`🚀 API listening on port ${port}`, 'Bootstrap');
}

bootstrap();
