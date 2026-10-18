// Mirrors airspace_edge/internal/proto (Go). Keep both sides in sync.
export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type GimbalMode = 'auto' | 'lock' | 'manual' | 'home';

/** [azimuth deg, elevation deg, range m | null] */
export type TrailPoint = [number, number, number | null];

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
  trail?: TrailPoint[];
}

export interface AirspaceGimbal {
  pan: number;
  tilt: number;
  targetId: number | null;
  mode?: GimbalMode;
  lockId?: number | null;
  commandSeq?: number;
}

export interface AirspaceSnapshot {
  sessionId?: string;
  ts: number;
  t?: number;
  fps?: number;
  gimbal: AirspaceGimbal;
  sensors?: { camera: string; radar: string };
  camera?: { hfov: number; vfov: number };
  tracks: AirspaceTrack[];
}

export type AirspaceEventType = 'track_new' | 'threat_up' | 'track_lost';

export interface AirspaceEvent {
  seq: number;
  at: string;
  sessionId: string;
  type: AirspaceEventType;
  trackId: number;
  threat?: ThreatLevel;
  label?: string;
  azimuth?: number;
  elevation?: number;
  range?: number | null;
}

export interface GimbalCommand {
  seq: number;
  mode: GimbalMode;
  trackId?: number;
  pan?: number;
  tilt?: number;
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
const MODES: GimbalMode[] = ['auto', 'lock', 'manual', 'home'];

export function threatRank(level: ThreatLevel): number {
  return LEVELS.indexOf(level);
}

export function isThreatLevel(v: unknown): v is ThreatLevel {
  return LEVELS.includes(v as ThreatLevel);
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
    isThreatLevel(t.threat) &&
    isNum(t.threatScore) &&
    Array.isArray(t.sources) &&
    (t.trail === undefined || (Array.isArray(t.trail) && t.trail.length <= 100))
  );
}

/** 관측기(airspace_edge)가 보낸 스냅샷의 최소 형태를 확인한다. */
export function parseSnapshot(body: unknown): AirspaceSnapshot | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const g = b.gimbal as Record<string, unknown> | undefined;
  if (!isNum(b.ts) || !g || !isNum(g.pan) || !isNum(g.tilt)) return null;
  if (b.sessionId !== undefined && (typeof b.sessionId !== 'string' || b.sessionId.length > 64)) return null;
  if (!Array.isArray(b.tracks) || b.tracks.length > 200 || !b.tracks.every(isTrack)) return null;
  return body as AirspaceSnapshot;
}

/** 화면에서 온 짐벌 명령 본문을 확인한다 (seq 는 서버가 붙인다). */
export function parseCommand(body: unknown): Omit<GimbalCommand, 'seq'> | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (!MODES.includes(b.mode as GimbalMode)) return null;
  const mode = b.mode as GimbalMode;
  if (mode === 'lock') {
    return isNum(b.trackId) && Number.isInteger(b.trackId) ? { mode, trackId: b.trackId } : null;
  }
  if (mode === 'manual') {
    if (!isNum(b.pan) || !isNum(b.tilt)) return null;
    if (b.pan < -90 || b.pan > 90 || b.tilt < -10 || b.tilt > 90) return null;
    return { mode, pan: b.pan, tilt: b.tilt };
  }
  return { mode };
}
