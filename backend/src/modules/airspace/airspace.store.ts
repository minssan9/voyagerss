import { Injectable } from '@nestjs/common';
import { AirspaceEvent, AirspaceSnapshot, AirspaceTrack, threatRank, ThreatLevel } from './airspace.types';

export type AirspaceMessage =
  | { kind: 'snapshot'; data: AirspaceSnapshot }
  | { kind: 'event'; data: AirspaceEvent };

const MAX_EVENTS = 300;
const ONLINE_WINDOW_MS = 3000;

/** 최신 스냅샷과 경보 이벤트 기록을 메모리에 들고, 구독자(SSE)에게 흘려보낸다. */
@Injectable()
export class AirspaceStore {
  private latest: AirspaceSnapshot | null = null;
  private receivedAt = 0;
  private events: AirspaceEvent[] = [];
  private seq = 0;
  private peak = new Map<number, ThreatLevel>();
  private listeners = new Set<(msg: AirspaceMessage) => void>();
  now: () => number = Date.now;

  ingest(snapshot: AirspaceSnapshot): AirspaceEvent[] {
    this.latest = snapshot;
    this.receivedAt = this.now();
    const fresh = this.diff(snapshot.tracks);
    this.emit({ kind: 'snapshot', data: snapshot });
    for (const event of fresh) {
      this.emit({ kind: 'event', data: event });
    }
    return fresh;
  }

  status() {
    const online = this.latest !== null && this.now() - this.receivedAt <= ONLINE_WINDOW_MS;
    return {
      online,
      receivedAt: this.receivedAt ? new Date(this.receivedAt).toISOString() : null,
      snapshot: this.latest,
    };
  }

  recentEvents(limit = 100): AirspaceEvent[] {
    const n = Math.min(MAX_EVENTS, Math.max(1, Math.trunc(limit) || 100));
    return this.events.slice(-n).reverse();
  }

  subscribe(listener: (msg: AirspaceMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private diff(tracks: AirspaceTrack[]): AirspaceEvent[] {
    const out: AirspaceEvent[] = [];
    const live = new Set<number>();
    for (const track of tracks) {
      if (track.status !== 'confirmed') continue;
      live.add(track.id);
      const prev = this.peak.get(track.id);
      if (prev === undefined || threatRank(track.threat) > threatRank(prev)) {
        out.push(this.record(prev === undefined ? 'track_new' : 'threat_up', track));
        this.peak.set(track.id, track.threat);
      }
    }
    for (const id of [...this.peak.keys()]) {
      if (!live.has(id)) {
        out.push(this.record('track_lost', { id }));
        this.peak.delete(id);
      }
    }
    return out;
  }

  private record(type: AirspaceEvent['type'], track: Partial<AirspaceTrack> & { id: number }): AirspaceEvent {
    const event: AirspaceEvent = {
      seq: ++this.seq,
      at: new Date(this.now()).toISOString(),
      type,
      trackId: track.id,
    };
    if (type !== 'track_lost') {
      Object.assign(event, {
        threat: track.threat,
        label: track.label,
        azimuth: track.azimuth,
        elevation: track.elevation,
        range: track.range,
      });
    }
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();
    return event;
  }

  private emit(msg: AirspaceMessage): void {
    for (const listener of this.listeners) {
      listener(msg);
    }
  }
}
