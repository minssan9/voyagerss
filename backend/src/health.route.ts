import type { Application } from 'express';

export function registerHealthRoute(app: Application): void {
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
