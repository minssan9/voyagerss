import Redis from 'ioredis';
import { maskSecrets } from '../utils/secret-mask';

export const LOG_CHANNEL = (runId: string) => `run-logs:${runId}`;

export class LogBroadcaster {
  private pub: Redis;

  constructor() {
    this.pub = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
  }

  async publish(runId: string, payload: object): Promise<void> {
    // Mask secrets before broadcasting to Redis / browser
    const safe = JSON.parse(maskSecrets(JSON.stringify(payload)));
    await this.pub.publish(LOG_CHANNEL(runId), JSON.stringify(safe));
  }

  async publishDone(runId: string): Promise<void> {
    await this.pub.publish(LOG_CHANNEL(runId), JSON.stringify({ type: 'done' }));
  }

  async quit(): Promise<void> {
    await this.pub.quit();
  }
}

export const logBroadcaster = new LogBroadcaster();
