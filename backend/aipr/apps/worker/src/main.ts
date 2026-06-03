import { initTelemetry } from '@repo/shared';
initTelemetry('auto-pr-worker'); // must be first

import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'warn', 'error'],
  });

  app.enableShutdownHooks();
  console.log('🔧 Worker started — queues: plan, build');
}

bootstrap();
