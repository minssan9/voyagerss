import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client-airspace';
import { AirspaceEvent, AirspaceSnapshot, AirspaceTrack, threatRank, ThreatLevel } from './airspace.types';

export const AIRSPACE_HISTORY_REPO = Symbol('AIRSPACE_HISTORY_REPO');
const TRACK_WRITE_INTERVAL_MS = 1000;
const MAX_PAGE = 500;

export interface TrackSummary {
  sessionId: string;
  trackId: number;
  label: string;
  maxThreat: ThreatLevel;
  maxScore: number;
  minRangeM: number | null;
  sources: string;
  lastAzimuth: number;
  lastElevation: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface HistoryQuery {
  from?: Date;
  to?: Date;
  threat?: ThreatLevel;
  limit: number;
  offset: number;
}

export interface HistoryPage<T> {
  rows: T[];
  total: number;
}

export interface AirspaceHistoryRepo {
  insertEvents(events: AirspaceEvent[]): Promise<void>;
  upsertTracks(rows: TrackSummary[]): Promise<void>;
  queryEvents(q: HistoryQuery): Promise<HistoryPage<AirspaceEvent>>;
  queryTracks(q: HistoryQuery): Promise<HistoryPage<TrackSummary>>;
  close?(): Promise<void>;
}

/** 경보 이벤트와 트랙 요약을 저장한다. DB 오류는 기록만 하고 실시간 처리를 막지 않는다. */
@Injectable()
export class AirspaceHistoryService implements OnModuleDestroy {
  private readonly log = new Logger('AirspaceHistory');
  private summaries = new Map<string, TrackSummary>();
  private lastWrite = new Map<string, number>();
  private warned = false;
  now: () => number = Date.now;

  constructor(@Optional() @Inject(AIRSPACE_HISTORY_REPO) private readonly repo: AirspaceHistoryRepo | null) {}

  get enabled(): boolean {
    return !!this.repo;
  }

  record(snapshot: AirspaceSnapshot, events: AirspaceEvent[]): Promise<void> {
    if (!this.repo) return Promise.resolve();
    const now = this.now();
    const due: TrackSummary[] = [];
    for (const track of snapshot.tracks) {
      if (track.status !== 'confirmed') continue;
      const key = `${snapshot.sessionId ?? ''}:${track.id}`;
      const summary = this.fold(this.summaries.get(key), snapshot.sessionId ?? '', track, new Date(now));
      this.summaries.set(key, summary);
      if (now - (this.lastWrite.get(key) ?? 0) >= TRACK_WRITE_INTERVAL_MS) {
        this.lastWrite.set(key, now);
        due.push(summary);
      }
    }
    for (const ev of events) {
      if (ev.type !== 'track_lost') continue;
      const key = `${ev.sessionId}:${ev.trackId}`;
      const summary = this.summaries.get(key);
      if (summary) due.push(summary); // 마지막 상태를 한 번 더 남긴다
      this.summaries.delete(key);
      this.lastWrite.delete(key);
    }
    return Promise.all([
      events.length ? this.repo.insertEvents(events) : undefined,
      due.length ? this.repo.upsertTracks(due) : undefined,
    ]).then(
      () => {
        this.warned = false;
      },
      (err) => {
        if (!this.warned) this.log.warn(`history write failed: ${err instanceof Error ? err.message : err}`);
        this.warned = true;
      },
    );
  }

  events(q: HistoryQuery): Promise<HistoryPage<AirspaceEvent>> {
    return this.repo ? this.repo.queryEvents(clampQuery(q)) : Promise.resolve({ rows: [], total: 0 });
  }

  tracks(q: HistoryQuery): Promise<HistoryPage<TrackSummary>> {
    return this.repo ? this.repo.queryTracks(clampQuery(q)) : Promise.resolve({ rows: [], total: 0 });
  }

  async onModuleDestroy() {
    await this.repo?.close?.();
  }

  private fold(prev: TrackSummary | undefined, sessionId: string, t: AirspaceTrack, at: Date): TrackSummary {
    const raised = !prev || threatRank(t.threat) > threatRank(prev.maxThreat);
    const minRange =
      t.range === null ? (prev?.minRangeM ?? null) : prev?.minRangeM == null ? t.range : Math.min(prev.minRangeM, t.range);
    return {
      sessionId,
      trackId: t.id,
      label: t.label !== 'aerial' || !prev ? t.label : prev.label,
      maxThreat: raised ? t.threat : prev!.maxThreat,
      maxScore: Math.max(prev?.maxScore ?? 0, t.threatScore),
      minRangeM: minRange,
      sources: [...new Set([...(prev?.sources.split(',').filter(Boolean) ?? []), ...t.sources])].sort().join(','),
      lastAzimuth: t.azimuth,
      lastElevation: t.elevation,
      firstSeen: prev?.firstSeen ?? at,
      lastSeen: at,
    };
  }
}

export function clampQuery(q: HistoryQuery): HistoryQuery {
  return {
    ...q,
    limit: Math.min(MAX_PAGE, Math.max(1, Math.trunc(q.limit) || 100)),
    offset: Math.max(0, Math.trunc(q.offset) || 0),
  };
}

/** Prisma(MySQL) 구현. 테이블은 db/migration/V5__airspace_history.sql 이 만든다. */
export class PrismaAirspaceHistoryRepo implements AirspaceHistoryRepo {
  constructor(private readonly db: PrismaClient) {}

  async insertEvents(events: AirspaceEvent[]): Promise<void> {
    await this.db.airspaceEvent.createMany({
      data: events.map((e) => ({
        sessionId: e.sessionId,
        type: e.type,
        trackId: e.trackId,
        threat: e.threat ?? null,
        label: e.label ?? null,
        azimuth: e.azimuth ?? null,
        elevation: e.elevation ?? null,
        rangeM: e.range ?? null,
        occurredAt: new Date(e.at),
      })),
    });
  }

  async upsertTracks(rows: TrackSummary[]): Promise<void> {
    await this.db.$transaction(
      rows.map((r) =>
        this.db.airspaceTrack.upsert({
          where: { sessionId_trackId: { sessionId: r.sessionId, trackId: r.trackId } },
          create: r,
          update: { ...r, firstSeen: undefined },
        }),
      ),
    );
  }

  async queryEvents(q: HistoryQuery): Promise<HistoryPage<AirspaceEvent>> {
    const where = {
      occurredAt: { gte: q.from, lte: q.to },
      ...(q.threat ? { threat: q.threat } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.airspaceEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: q.limit, skip: q.offset }),
      this.db.airspaceEvent.count({ where }),
    ]);
    return {
      total,
      rows: rows.map((r) => ({
        seq: Number(r.id),
        at: r.occurredAt.toISOString(),
        sessionId: r.sessionId,
        type: r.type as AirspaceEvent['type'],
        trackId: r.trackId,
        threat: (r.threat ?? undefined) as ThreatLevel | undefined,
        label: r.label ?? undefined,
        azimuth: r.azimuth ?? undefined,
        elevation: r.elevation ?? undefined,
        range: r.rangeM,
      })),
    };
  }

  async queryTracks(q: HistoryQuery): Promise<HistoryPage<TrackSummary>> {
    const where = {
      lastSeen: { gte: q.from },
      firstSeen: { lte: q.to },
      ...(q.threat ? { maxThreat: q.threat } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.airspaceTrack.findMany({ where, orderBy: { lastSeen: 'desc' }, take: q.limit, skip: q.offset }),
      this.db.airspaceTrack.count({ where }),
    ]);
    return {
      total,
      rows: rows.map(({ id: _id, ...r }) => ({ ...r, maxThreat: r.maxThreat as ThreatLevel })),
    };
  }

  async close(): Promise<void> {
    await this.db.$disconnect();
  }
}
