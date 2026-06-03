import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { BuildProcessor } from './processors/build.processor';
import { PlanProcessor } from './processors/plan.processor';
import { LogBroadcaster } from './sse/log-broadcaster';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

@Module({
  imports: [
    BullModule.forRoot({ connection: REDIS_CONFIG }),
    BullModule.registerQueue(
      { name: 'plan',  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } } },
      { name: 'build', defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } } },
    ),
    PrismaModule,
  ],
  providers: [PlanProcessor, BuildProcessor, LogBroadcaster],
})
export class WorkerModule {}
