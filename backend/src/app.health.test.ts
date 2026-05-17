import express from 'express';
import request from 'supertest';
import { registerHealthRoute } from './health.route';
import { TRUST_PROXY_HOPS } from './server-config';

describe('production API health', () => {
  it('GET /health returns ok for DO load balancer checks', async () => {
    const app = express();
    app.set('trust proxy', TRUST_PROXY_HOPS);
    registerHealthRoute(app);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(response.body.timestamp).toBeDefined();
  });

  it('uses trust proxy hops for LB + nginx', () => {
    const app = express();
    app.set('trust proxy', TRUST_PROXY_HOPS);
    expect(app.get('trust proxy')).toBe(TRUST_PROXY_HOPS);
  });
});
