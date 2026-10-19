import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Test } from '@nestjs/testing';
import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { AirspaceModule } from './airspace.module';
import { ingestAllowed } from './airspace.controller';
import { AirspaceStore } from './airspace.store';
import {
  AirspaceHistoryRepo,
  AirspaceHistoryService,
  HistoryPage,
  HistoryQuery,
  TrackSummary,
} from './airspace-history.service';
import { AirspaceEvent, AirspaceSnapshot, AirspaceTrack, parseCommand, parseSnapshot } from './airspace.types';
import { JwtAuthGuard } from '../workschd/guards/jwt-auth.guard';

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
    trail: [[10, 20, 80]],
  } satisfies AirspaceTrack;
}

function snapshot(tracks: AirspaceTrack[], sessionId = 's1', commandSeq = 0): AirspaceSnapshot {
  return { sessionId, ts: 1, gimbal: { pan: 0, tilt: 20, targetId: null, mode: 'auto', commandSeq }, tracks };
}

describe('parseSnapshot / parseCommand', () => {
  it('accepts the edge snapshot shape and rejects bad ones', () => {
    expect(parseSnapshot(snapshot([track(1)]))).not.toBeNull();
    expect(parseSnapshot({ ts: 1, tracks: [] })).toBeNull();
    expect(parseSnapshot({ ...snapshot([]), tracks: [{ id: 'x' }] })).toBeNull();
    expect(parseSnapshot(snapshot(Array.from({ length: 201 }, (_, i) => track(i))))).toBeNull();
  });

  it('validates gimbal commands per mode', () => {
    expect(parseCommand({ mode: 'auto' })).toEqual({ mode: 'auto' });
    expect(parseCommand({ mode: 'lock', trackId: 3 })).toEqual({ mode: 'lock', trackId: 3 });
    expect(parseCommand({ mode: 'lock' })).toBeNull();
    expect(parseCommand({ mode: 'manual', pan: 10, tilt: 30 })).toEqual({ mode: 'manual', pan: 10, tilt: 30 });
    expect(parseCommand({ mode: 'manual', pan: 120, tilt: 30 })).toBeNull();
    expect(parseCommand({ mode: 'fire' })).toBeNull();
  });
});

describe('ingestAllowed', () => {
  it('needs a matching token when one is configured, and one in production', () => {
    expect(ingestAllowed('secret', 'secret', true)).toBe(true);
    expect(ingestAllowed('wrong!', 'secret', false)).toBe(false);
    expect(ingestAllowed(undefined, 'secret', false)).toBe(false);
    expect(ingestAllowed(undefined, undefined, false)).toBe(true);
    expect(ingestAllowed(undefined, undefined, true)).toBe(false);
  });
});

describe('AirspaceStore', () => {
  it('emits new, threat-up and lost events once each, ignoring tentative tracks', () => {
    const store = new AirspaceStore();
    const types = (tracks: AirspaceTrack[]) =>
      store.ingest(snapshot(tracks)).events.map((e) => `${e.type}:${e.trackId}`);
    expect(types([track(1), track(2, 'LOW', 'tentative')])).toEqual(['track_new:1']);
    expect(types([track(1, 'MEDIUM')])).toEqual(['threat_up:1']);
    expect(types([track(1, 'LOW')])).toEqual([]);
    expect(types([])).toEqual(['track_lost:1']);
  });

  it('ends the old session tracks and drops its pending command when the edge restarts', () => {
    const store = new AirspaceStore();
    store.ingest(snapshot([track(1)], 'a'));
    store.queueCommand({ mode: 'home' });
    const { events, command } = store.ingest(snapshot([track(1)], 'b'));
    expect(events.map((e) => `${e.sessionId}:${e.type}:${e.trackId}`)).toEqual(['a:track_lost:1', 'b:track_new:1']);
    expect(command).toBeNull();
  });

  it('hands a queued command to the edge until the edge acknowledges it', () => {
    const store = new AirspaceStore();
    store.ingest(snapshot([], 's1', 4));
    const cmd = store.queueCommand({ mode: 'lock', trackId: 2 });
    expect(cmd.seq).toBe(5);
    expect(store.ingest(snapshot([], 's1', 4)).command).toEqual(cmd);
    expect(store.ingest(snapshot([], 's1', 5)).command).toBeNull();
    expect(store.queueCommand({ mode: 'auto' }).seq).toBe(6);
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

class FakeRepo implements AirspaceHistoryRepo {
  events: AirspaceEvent[] = [];
  tracks = new Map<string, TrackSummary>();
  fail = false;
  async insertEvents(events: AirspaceEvent[]) {
    if (this.fail) throw new Error('db down');
    this.events.push(...events);
  }
  async upsertTracks(rows: TrackSummary[]) {
    if (this.fail) throw new Error('db down');
    for (const r of rows) this.tracks.set(`${r.sessionId}:${r.trackId}`, r);
  }
  async queryEvents(q: HistoryQuery): Promise<HistoryPage<AirspaceEvent>> {
    const rows = this.events.filter((e) => !q.threat || e.threat === q.threat);
    return { rows: rows.slice(q.offset, q.offset + q.limit), total: rows.length };
  }
  async queryTracks(): Promise<HistoryPage<TrackSummary>> {
    return { rows: [...this.tracks.values()], total: this.tracks.size };
  }
}

describe('AirspaceHistoryService', () => {
  it('stores events and throttled track summaries with peak threat and closest range', async () => {
    const repo = new FakeRepo();
    const store = new AirspaceStore();
    const svc = new AirspaceHistoryService(repo);
    let now = 1_000_000;
    svc.now = store.now = () => now;
    const step = async (t: AirspaceTrack[]) => {
      const s = snapshot(t);
      await svc.record(s, store.ingest(s).events);
    };

    await step([{ ...track(1, 'MEDIUM'), range: 90 }]);
    now += 200;
    await step([{ ...track(1, 'HIGH'), range: 40, sources: ['camera', 'radar'], label: 'drone' }]);
    expect(repo.tracks.get('s1:1')?.maxThreat).toBe('MEDIUM'); // throttled: one write per second
    now += 200;
    await step([{ ...track(1, 'LOW'), range: 60 }]);
    now += 200;
    await step([]); // lost: final summary written
    const t = repo.tracks.get('s1:1')!;
    expect(t).toMatchObject({ maxThreat: 'HIGH', minRangeM: 40, sources: 'camera,radar', label: 'drone' });
    expect(repo.events.map((e) => e.type)).toEqual(['track_new', 'threat_up', 'track_lost']);
    expect((await svc.events({ threat: 'HIGH', limit: 10, offset: 0 })).total).toBe(1);
  });

  it('swallows database errors so the live path keeps working', async () => {
    const repo = new FakeRepo();
    repo.fail = true;
    const svc = new AirspaceHistoryService(repo);
    await expect(svc.record(snapshot([track(1)]), [])).resolves.toBeUndefined();
  });

  it('is a no-op without a database', async () => {
    const svc = new AirspaceHistoryService(null);
    expect(svc.enabled).toBe(false);
    expect(await svc.events({ limit: 10, offset: 0 })).toEqual({ rows: [], total: 0 });
  });
});

class HeaderGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    return ctx.switchToHttp().getRequest().headers.authorization === 'Bearer ok';
  }
}

describe('AirspaceController over HTTP', () => {
  let app: INestApplication;
  let base: string;
  const original = { token: process.env.AIRSPACE_INGEST_TOKEN, db: process.env.DATABASE_URL };

  beforeAll(async () => {
    process.env.AIRSPACE_INGEST_TOKEN = 'tok';
    delete process.env.DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AirspaceModule] })
      .overrideGuard(JwtAuthGuard)
      .useClass(HeaderGuard)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/airspace`;
  });

  afterAll(async () => {
    process.env.AIRSPACE_INGEST_TOKEN = original.token;
    if (original.db !== undefined) process.env.DATABASE_URL = original.db;
    await app.close();
  });

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  it('rejects a wrong token and a malformed snapshot', async () => {
    expect((await post('ingest', snapshot([]), { 'X-Airspace-Token': 'nope' })).status).toBe(401);
    expect((await post('ingest', { ts: 'x' }, { 'X-Airspace-Token': 'tok' })).status).toBe(400);
  });

  it('requires login for gimbal commands and returns them on the next ingest', async () => {
    expect((await post('gimbal', { mode: 'home' })).status).toBe(403);
    expect((await post('gimbal', { mode: 'fire' }, { Authorization: 'Bearer ok' })).status).toBe(400);
    const queued = await (await post('gimbal', { mode: 'lock', trackId: 7 }, { Authorization: 'Bearer ok' })).json();
    expect(queued.data).toMatchObject({ mode: 'lock', trackId: 7 });
    const ingest = await (await post('ingest', snapshot([]), { 'X-Airspace-Token': 'tok' })).json();
    expect(ingest.data.command).toMatchObject({ mode: 'lock', trackId: 7, seq: queued.data.seq });
  });

  it('relays edge JPEG frames to MJPEG viewers', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const received = new Promise<Buffer>((resolve, reject) => {
      const req = http.get(`${base}/camera/stream`, (res) => {
        expect(res.headers['content-type']).toContain('multipart/x-mixed-replace');
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => {
          chunks.push(c);
          const all = Buffer.concat(chunks);
          if (all.includes(jpeg)) {
            req.destroy();
            resolve(all);
          }
        });
        fetch(`${base}/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'image/jpeg', 'X-Airspace-Token': 'tok' },
          body: jpeg,
        }).then((r) => expect(r.status).toBe(204), reject);
      });
      req.on('error', (err) => (err.message.includes('aborted') ? undefined : reject(err)));
    });
    expect((await received).toString('latin1')).toContain('Content-Type: image/jpeg');
    const latest = await fetch(`${base}/camera/latest.jpg`);
    expect(Buffer.from(await latest.arrayBuffer())).toEqual(jpeg);
    const notJpeg = await fetch(`${base}/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'X-Airspace-Token': 'tok' },
      body: Buffer.from('hello'),
    });
    expect(notJpeg.status).toBe(400);
  });

  it('streams snapshots and events to SSE subscribers', async () => {
    const received: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = http.get(`${base}/stream`, (res) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          received.push(chunk);
          if (received.join('').includes('"trackId":9')) {
            req.destroy();
            resolve();
          }
        });
        post('ingest', snapshot([track(9, 'HIGH')], 's2'), { 'X-Airspace-Token': 'tok' }).catch(reject);
      });
      req.on('error', (err) => (err.message.includes('aborted') ? resolve() : reject(err)));
    });
    expect(received.join('')).toContain('event: snapshot');
    const status = await (await fetch(`${base}/status`)).json();
    expect(status.data).toMatchObject({ online: true, cameraLive: true, history: false });
  });

  it('answers history queries with an empty page when no database is configured', async () => {
    const res = await (await fetch(`${base}/history/events?threat=HIGH&limit=5`)).json();
    expect(res.data).toEqual({ rows: [], total: 0 });
    expect((await fetch(`${base}/history/events?threat=PURPLE`)).status).toBe(400);
  });
});
