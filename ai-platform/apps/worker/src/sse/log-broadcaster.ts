import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { maskSecrets } from '@repo/shared';
import Redis from 'ioredis';

export const LOG_CHANNEL = (runId: string) => `run-logs:${runId}`;

@Injectable()
export class LogBroadcaster implements OnModuleInit, OnModuleDestroy {
  private pub: Redis;

  onModuleInit() {
    this.pub = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
  }

  async onModuleDestroy() {
    await this.pub.quit();
  }

  async publish(runId: string, payload: object): Promise<void> {
    // Mask secrets before broadcasting to Redis / browser
    const safe = JSON.parse(maskSecrets(JSON.stringify(payload)));
    await this.pub.publish(LOG_CHANNEL(runId), JSON.stringify(safe));
  }

  async publishDone(runId: string): Promise<void> {
    await this.pub.publish(LOG_CHANNEL(runId), JSON.stringify({ type: 'done' }));
  }
}
