import service from '@/api/common/axios-voyagerss'
import axios from 'axios'
import { i18n } from '@/locales/i18n'

export type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH'

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
}

export interface AirspaceSnapshot {
  ts: number
  fps?: number
  gimbal: { pan: number; tilt: number; targetId: number | null }
  sensors?: { camera: boolean; radar: string }
  camera?: { hfov: number; vfov: number }
  tracks: AirspaceTrack[]
}

export interface AirspaceEvent {
  seq: number
  at: string
  type: 'track_new' | 'threat_up' | 'track_lost'
  trackId: number
  threat?: ThreatLevel
  label?: string
  azimuth?: number
  elevation?: number
  range?: number | null
}

export interface AirspaceStatus {
  online: boolean
  receivedAt: string | null
  snapshot: AirspaceSnapshot | null
}

interface ApiEnvelope<T> {
  result: 'SUCCESS' | 'ERROR'
  message: string
  data: T | null
}

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<ApiEnvelope<T>> {
  try {
    return (await request).data
  } catch (error) {
    const message = axios.isAxiosError(error) ? error.message : i18n.global.t('airspace.errors.requestFailed')
    return { result: 'ERROR', message, data: null }
  }
}

export function getAirspaceStatus(): Promise<ApiEnvelope<AirspaceStatus>> {
  return unwrap(service.get('/airspace/status'))
}

export function getAirspaceEvents(limit = 100): Promise<ApiEnvelope<AirspaceEvent[]>> {
  return unwrap(service.get('/airspace/events', { params: { limit } }))
}

export function openAirspaceStream(handlers: {
  onSnapshot: (snapshot: AirspaceSnapshot) => void
  onEvent: (event: AirspaceEvent) => void
  onConnection: (connected: boolean) => void
}): () => void {
  const base = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  const source = new EventSource(`${base}/airspace/stream`)
  source.onopen = () => handlers.onConnection(true)
  source.onerror = () => handlers.onConnection(false)
  source.addEventListener('snapshot', (e) => handlers.onSnapshot(JSON.parse((e as MessageEvent).data)))
  source.addEventListener('event', (e) => handlers.onEvent(JSON.parse((e as MessageEvent).data)))
  return () => source.close()
}
