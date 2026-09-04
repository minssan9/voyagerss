import Redis from 'ioredis';
import { Response } from 'express';
import { LOG_CHANNEL } from './LogBroadcaster';

export class RunsService {
  private sub: Redis;

  constructor() {
    this.sub = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
    });
  }

  /**
   * Stream run logs via SSE.
   * Subscribes to Redis pub/sub and forwards each message as an SSE event.
   */
  async streamLogs(runId: string, res: Response): Promise<void> {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    const subscriber = this.sub.duplicate();
    await subscriber.subscribe(LOG_CHANNEL(runId));

    const cleanup = async () => {
      try {
        await subscriber.unsubscribe();
        await subscriber.quit();
      } catch { /* ignore */ }
      res.end();
    };

    subscriber.on('message', (_ch: string, msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.type === 'done') {
          res.write('event: done\ndata: {}\n\n');
          void cleanup();
          return;
        }
        res.write(`event: log\ndata: ${JSON.stringify(parsed.data ?? parsed)}\n\n`);
      } catch { /* ignore */ }
    });

    // Client disconnect
    res.on('close', () => void cleanup());

    // Keepalive ping every 15s
    const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
    res.on('close', () => clearInterval(ping));
  }

  async quit(): Promise<void> {
    await this.sub.quit();
  }
}

export const runsService = new RunsService();
