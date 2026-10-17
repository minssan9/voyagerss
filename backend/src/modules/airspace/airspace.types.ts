export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AirspaceTrack {
  id: number;
  status: 'confirmed' | 'tentative';
  label: string;
  azimuth: number;
  elevation: number;
  range: number | null;
  radialVelocity: number | null;
  angularRate?: [number, number];
  sources: string[];
  hits?: number;
  age?: number;
  threat: ThreatLevel;
  threatScore: number;
  position?: [number, number, number];
}

export interface AirspaceSnapshot {
  ts: number;
  t?: number;
  fps?: number;
  gimbal: { pan: number; tilt: number; targetId: number | null };
  sensors?: { camera: boolean; radar: string };
  camera?: { hfov: number; vfov: number };
  tracks: AirspaceTrack[];
}

export type AirspaceEventType = 'track_new' | 'threat_up' | 'track_lost';

export interface AirspaceEvent {
  seq: number;
  at: string;
  type: AirspaceEventType;
  trackId: number;
  threat?: ThreatLevel;
  label?: string;
  azimuth?: number;
  elevation?: number;
  range?: number | null;
}

export interface ApiEnvelope<T> {
  result: 'SUCCESS' | 'ERROR';
  message: string;
  data: T | null;
}

export function success<T>(data: T, message = 'ok'): ApiEnvelope<T> {
  return { result: 'SUCCESS', message, data };
}

const LEVELS: ThreatLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

export function threatRank(level: ThreatLevel): number {
  return LEVELS.indexOf(level);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isTrack(v: unknown): v is AirspaceTrack {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (
    isNum(t.id) &&
    (t.status === 'confirmed' || t.status === 'tentative') &&
    typeof t.label === 'string' &&
    isNum(t.azimuth) &&
    isNum(t.elevation) &&
    (t.range === null || isNum(t.range)) &&
    LEVELS.includes(t.threat as ThreatLevel) &&
    isNum(t.threatScore) &&
    Array.isArray(t.sources)
  );
}

/** 관측기(vision_cam.airspace)가 보낸 스냅샷의 최소 형태를 확인한다. */
export function parseSnapshot(body: unknown): AirspaceSnapshot | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const g = b.gimbal as Record<string, unknown> | undefined;
  if (!isNum(b.ts) || !g || !isNum(g.pan) || !isNum(g.tilt)) return null;
  if (!Array.isArray(b.tracks) || b.tracks.length > 200 || !b.tracks.every(isTrack)) return null;
  return body as AirspaceSnapshot;
}
