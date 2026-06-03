import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { FastifyReply } from 'fastify';

const LOG_CHANNEL = (runId: string) => `run-logs:${runId}`;

@Injectable()
export class RunsService implements OnModuleInit, OnModuleDestroy {
  private sub: Redis;

  onModuleInit() {
    this.sub = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
    });
  }

  async onModuleDestroy() {
    await this.sub.quit();
  }

  /**
   * Stream run logs via SSE.
   * Subscribes to Redis pub/sub and forwards each message as an SSE event.
   */
  async streamLogs(runId: string, reply: FastifyReply): Promise<void> {
    const raw = reply.raw;
    raw.setHeader('Content-Type',  'text/event-stream');
    raw.setHeader('Cache-Control', 'no-cache');
    raw.setHeader('Connection',    'keep-alive');
    raw.flushHeaders();

    const subscriber = this.sub.duplicate();
    await subscriber.subscribe(LOG_CHANNEL(runId));

    const cleanup = async () => {
      await subscriber.unsubscribe();
      await subscriber.quit();
      raw.end();
    };

    subscriber.on('message', (_ch: string, msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.type === 'done') {
          raw.write('event: done\ndata: {}\n\n');
          void cleanup();
          return;
        }
        raw.write(`event: log\ndata: ${JSON.stringify(parsed.data ?? parsed)}\n\n`);
      } catch { /* ignore */ }
    });

    // Client disconnect
    raw.on('close', () => void cleanup());

    // Keepalive ping every 15s
    const ping = setInterval(() => raw.write(': ping\n\n'), 15_000);
    raw.on('close', () => clearInterval(ping));
  }
}
