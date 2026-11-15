import { PrismaClient } from '@prisma/client-airspace';
import { AirspaceHistoryService, PrismaAirspaceHistoryRepo } from './airspace-history.service';
import { AirspaceStore } from './airspace.store';
import { AirspaceTrack } from './airspace.types';

const tr = (threat: AirspaceTrack['threat'], range: number): AirspaceTrack => ({
  id: 1, status: 'confirmed', label: 'aerial', azimuth: 10, elevation: 20, range, radialVelocity: -3,
  sources: ['radar'], threat, threatScore: threat === 'HIGH' ? 0.7 : 0.4,
});

// Opt-in: needs a scratch MySQL with db/migration/V5__airspace_history.sql applied.
// Never point it at a shared database; it writes rows.
const url = process.env.AIRSPACE_TEST_DATABASE_URL;
(url ? it : it.skip)('writes and reads airspace history in MySQL', async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const repo = new PrismaAirspaceHistoryRepo(db);
  const store = new AirspaceStore();
  const svc = new AirspaceHistoryService(repo);
  let now = Date.parse('2026-10-19T00:00:00Z');
  svc.now = store.now = () => now;
  const step = async (t: AirspaceTrack[]) => {
    const s = { sessionId: 'verify', ts: 1, gimbal: { pan: 0, tilt: 0, targetId: null }, tracks: t };
    await svc.record(s, store.ingest(s).events);
  };
  await step([tr('MEDIUM', 90)]);
  now += 1500;
  await step([tr('HIGH', 40)]);
  now += 1500;
  await step([]);
  const ev = await svc.events({ limit: 10, offset: 0, from: new Date('2026-10-18T00:00:00Z') });
  expect(ev.rows.map((e) => e.type).sort()).toEqual(['threat_up', 'track_lost', 'track_new']);
  const high = await svc.events({ limit: 10, offset: 0, threat: 'HIGH' });
  expect(high.total).toBe(1);
  const tracks = await svc.tracks({ limit: 10, offset: 0 });
  expect(tracks.rows[0]).toMatchObject({ sessionId: 'verify', trackId: 1, maxThreat: 'HIGH', minRangeM: 40 });
  expect(tracks.rows[0].firstSeen.toISOString()).toBe('2026-10-19T00:00:00.000Z');
  await repo.close();
});
