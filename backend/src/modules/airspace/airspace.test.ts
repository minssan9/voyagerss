import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AirspaceModule } from './airspace.module';
import { ingestAllowed } from './airspace.controller';
import { AirspaceStore } from './airspace.store';
import { AirspaceSnapshot, AirspaceTrack, parseSnapshot } from './airspace.types';

function track(id: number, threat: AirspaceTrack['threat'] = 'LOW', status: AirspaceTrack['status'] = 'confirmed') {
  return {
    id,
    status,
    label: 'aerial',
    azimuth: 10,
    elevation: 20,
    range: 80,
    radialVelocity: -3,
    sources: ['radar'],
    threat,
    threatScore: 0.4,
  } satisfies AirspaceTrack;
}

function snapshot(tracks: AirspaceTrack[]): AirspaceSnapshot {
  return { ts: 1, gimbal: { pan: 0, tilt: 20, targetId: null }, tracks };
}

describe('parseSnapshot', () => {
  it('accepts the runner snapshot shape', () => {
    expect(parseSnapshot(snapshot([track(1)]))).not.toBeNull();
  });

  it('rejects missing gimbal, bad tracks and oversized payloads', () => {
    expect(parseSnapshot({ ts: 1, tracks: [] })).toBeNull();
    expect(parseSnapshot({ ...snapshot([]), tracks: [{ id: 'x' }] })).toBeNull();
    expect(parseSnapshot(snapshot(Array.from({ length: 201 }, (_, i) => track(i))))).toBeNull();
  });
});

describe('ingestAllowed', () => {
  it('needs a matching token when one is configured', () => {
    expect(ingestAllowed('secret', 'secret', true)).toBe(true);
    expect(ingestAllowed('wrong!', 'secret', false)).toBe(false);
    expect(ingestAllowed(undefined, 'secret', false)).toBe(false);
  });

  it('is open in development only when no token is configured', () => {
    expect(ingestAllowed(undefined, undefined, false)).toBe(true);
    expect(ingestAllowed(undefined, undefined, true)).toBe(false);
  });
});

describe('AirspaceStore', () => {
  it('emits new, threat-up and lost events once each, ignoring tentative tracks', () => {
    const store = new AirspaceStore();
    const types = (tracks: AirspaceTrack[]) => store.ingest(snapshot(tracks)).map((e) => `${e.type}:${e.trackId}`);

    expect(types([track(1), track(2, 'LOW', 'tentative')])).toEqual(['track_new:1']);
    expect(types([track(1, 'MEDIUM')])).toEqual(['threat_up:1']);
    expect(types([track(1, 'LOW')])).toEqual([]);
    expect(types([track(1, 'MEDIUM')])).toEqual([]);
    expect(types([])).toEqual(['track_lost:1']);
    expect(store.recentEvents(10).map((e) => e.type)).toEqual(['track_lost', 'threat_up', 'track_new']);
  });

  it('reports online only while snapshots keep arriving', () => {
    const store = new AirspaceStore();
    let now = 1_000_000;
    store.now = () => now;
    expect(store.status().online).toBe(false);
    store.ingest(snapshot([]));
    expect(store.status().online).toBe(true);
    now += 5000;
    expect(store.status().online).toBe(false);
  });
});

describe('AirspaceController over HTTP', () => {
  let app: INestApplication;
  let base: string;
  const original = process.env.AIRSPACE_INGEST_TOKEN;

  beforeAll(async () => {
    process.env.AIRSPACE_INGEST_TOKEN = 'tok';
    const moduleRef = await Test.createTestingModule({ imports: [AirspaceModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/airspace`;
  });

  afterAll(async () => {
    process.env.AIRSPACE_INGEST_TOKEN = original;
    await app.close();
  });

  const post = (body: unknown, token?: string) =>
    fetch(`${base}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Airspace-Token': token } : {}) },
      body: JSON.stringify(body),
    });

  it('rejects a wrong token and a malformed snapshot', async () => {
    expect((await post(snapshot([]), 'nope')).status).toBe(401);
    expect((await post({ ts: 'x' }, 'tok')).status).toBe(400);
  });

  it('streams snapshots and events to SSE subscribers', async () => {
    const received: string[] = [];
    const done = new Promise<void>((resolve, reject) => {
      const req = http.get(`${base}/stream`, (res) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          received.push(chunk);
          if (received.join('').includes('event: event')) {
            req.destroy();
            resolve();
          }
        });
        post(snapshot([track(7, 'HIGH')]), 'tok').catch(reject);
      });
      req.on('error', (err) => (err.message.includes('aborted') ? resolve() : reject(err)));
    });
    await done;
    const text = received.join('');
    expect(text).toContain('event: snapshot');
    expect(text).toContain('"trackId":7');

    const status = await (await fetch(`${base}/status`)).json();
    expect(status.data.online).toBe(true);
    expect(status.data.snapshot.tracks[0].id).toBe(7);
  });
});
