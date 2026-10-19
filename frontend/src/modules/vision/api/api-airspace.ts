import service from '@/api/common/axios-voyagerss'
import axios from 'axios'
import { i18n } from '@/locales/i18n'

// Mirrors backend/src/modules/airspace/airspace.types.ts
export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type GimbalMode = 'auto' | 'lock' | 'manual' | 'home'
export type TrailPoint = [number, number, number | null]

export interface AirspaceTrack {
  id: number
  status: 'confirmed' | 'tentative'
  label: string
  azimuth: number
  elevation: number
  range: number | null
  radialVelocity: number | null
  sources: string[]
  threat: ThreatLevel
  threatScore: number
  age?: number
  trail?: TrailPoint[]
}

export interface AirspaceGimbal {
  pan: number
  tilt: number
  targetId: number | null
  mode?: GimbalMode
  lockId?: number | null
  commandSeq?: number
}

export interface AirspaceSnapshot {
  sessionId?: string
  ts: number
  fps?: number
  gimbal: AirspaceGimbal
  sensors?: { camera: string; radar: string }
  camera?: { hfov: number; vfov: number }
  tracks: AirspaceTrack[]
}

export interface AirspaceEvent {
  seq: number
  at: string
  sessionId?: string
  type: 'track_new' | 'threat_up' | 'track_lost'
  trackId: number
  threat?: ThreatLevel
  label?: string
  azimuth?: number
  elevation?: number
  range?: number | null
}

export interface GimbalCommand {
  seq: number
  mode: GimbalMode
  trackId?: number
  pan?: number
  tilt?: number
}

export type GimbalCommandInput =
  | { mode: 'auto' | 'home' }
  | { mode: 'lock'; trackId: number }
  | { mode: 'manual'; pan: number; tilt: number }

export interface AirspaceStatus {
  online: boolean
  receivedAt: string | null
  snapshot: AirspaceSnapshot | null
  pendingCommand: GimbalCommand | null
  cameraLive: boolean
  history: boolean
}

export interface TrackSummary {
  sessionId: string
  trackId: number
  label: string
  maxThreat: ThreatLevel
  maxScore: number
  minRangeM: number | null
  sources: string
  lastAzimuth: number
  lastElevation: number
  firstSeen: string
  lastSeen: string
}

export interface HistoryQuery {
  from?: string
  to?: string
  threat?: ThreatLevel
  limit: number
  offset: number
}

export interface HistoryPage<T> {
  rows: T[]
  total: number
}

interface ApiEnvelope<T> {
  result: 'SUCCESS' | 'ERROR'
  message: string
  data: T | null
}

function readError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined
    if (data && typeof data.message === 'string') return data.message
    return error.message
  }
  return i18n.global.t('airspace.errors.requestFailed')
}

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<ApiEnvelope<T>> {
  try {
    return (await request).data
  } catch (error) {
    return { result: 'ERROR', message: readError(error), data: null }
  }
}

export function apiBase(): string {
  return String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
}

export function cameraStreamUrl(): string {
  return `${apiBase()}/airspace/camera/stream`
}

export function getAirspaceStatus(): Promise<ApiEnvelope<AirspaceStatus>> {
  return unwrap(service.get('/airspace/status'))
}

export function getAirspaceEvents(limit = 100): Promise<ApiEnvelope<AirspaceEvent[]>> {
  return unwrap(service.get('/airspace/events', { params: { limit } }))
}

export function sendGimbalCommand(command: GimbalCommandInput): Promise<ApiEnvelope<GimbalCommand>> {
  return unwrap(service.post('/airspace/gimbal', command))
}

export function getHistoryEvents(q: HistoryQuery): Promise<ApiEnvelope<HistoryPage<AirspaceEvent>>> {
  return unwrap(service.get('/airspace/history/events', { params: q }))
}

export function getHistoryTracks(q: HistoryQuery): Promise<ApiEnvelope<HistoryPage<TrackSummary>>> {
  return unwrap(service.get('/airspace/history/tracks', { params: q }))
}

export function openAirspaceStream(handlers: {
  onSnapshot: (snapshot: AirspaceSnapshot) => void
  onEvent: (event: AirspaceEvent) => void
  onCommand?: (command: GimbalCommand) => void
  onConnection: (connected: boolean) => void
}): () => void {
  const source = new EventSource(`${apiBase()}/airspace/stream`)
  source.onopen = () => handlers.onConnection(true)
  source.onerror = () => handlers.onConnection(false)
  source.addEventListener('snapshot', (e) => handlers.onSnapshot(JSON.parse((e as MessageEvent).data)))
  source.addEventListener('event', (e) => handlers.onEvent(JSON.parse((e as MessageEvent).data)))
  source.addEventListener('command', (e) => handlers.onCommand?.(JSON.parse((e as MessageEvent).data)))
  return () => source.close()
}

/** RFC 4180 CSV; values containing commas, quotes or newlines are quoted. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
