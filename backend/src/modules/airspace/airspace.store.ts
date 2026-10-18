import { Injectable } from '@nestjs/common';
import {
  AirspaceEvent,
  AirspaceSnapshot,
  AirspaceTrack,
  GimbalCommand,
  threatRank,
  ThreatLevel,
} from './airspace.types';

export type AirspaceMessage =
  | { kind: 'snapshot'; data: AirspaceSnapshot }
  | { kind: 'event'; data: AirspaceEvent }
  | { kind: 'command'; data: GimbalCommand };

const MAX_EVENTS = 300;
const ONLINE_WINDOW_MS = 3000;

/**
 * 최신 스냅샷, 경보 이벤트, 대기 중인 짐벌 명령을 메모리에 들고 구독자(SSE)에게 흘려보낸다.
 * 명령은 edge 가 ingest 할 때 응답으로 내려가고, 스냅샷의 gimbal.commandSeq 로 처리 확인된다.
 */
@Injectable()
export class AirspaceStore {
  private latest: AirspaceSnapshot | null = null;
  private receivedAt = 0;
  private sessionId = '';
  private events: AirspaceEvent[] = [];
  private seq = 0;
  private commandSeq = 0;
  private pending: GimbalCommand | null = null;
  private peak = new Map<number, ThreatLevel>();
  private listeners = new Set<(msg: AirspaceMessage) => void>();
  now: () => number = Date.now;

  /** 스냅샷을 받아 이벤트를 만들고, edge 에 보낼 명령이 있으면 돌려준다. */
  ingest(snapshot: AirspaceSnapshot): { events: AirspaceEvent[]; command: GimbalCommand | null } {
    const session = snapshot.sessionId ?? '';
    const fresh: AirspaceEvent[] = [];
    if (this.latest && session !== this.sessionId) {
      // edge 가 재시작했다: 이전 트랙은 끝났고, 이전 세션에 보낸 명령은 의미가 없다.
      for (const id of this.peak.keys()) fresh.push(this.record('track_lost', { id }));
      this.peak.clear();
      this.pending = null;
    }
    this.sessionId = session;
    this.latest = snapshot;
    this.receivedAt = this.now();
    fresh.push(...this.diff(snapshot.tracks));

    const acked = snapshot.gimbal.commandSeq ?? 0;
    if (this.pending && acked >= this.pending.seq) this.pending = null;

    this.emit({ kind: 'snapshot', data: snapshot });
    for (const event of fresh) this.emit({ kind: 'event', data: event });
    return { events: fresh, command: this.pending };
  }

  queueCommand(command: Omit<GimbalCommand, 'seq'>): GimbalCommand {
    // edge 는 자신이 마지막으로 처리한 번호보다 큰 명령만 받으므로, 세션의 ack 위로 번호를 잇는다.
    const acked = this.latest?.gimbal.commandSeq ?? 0;
    this.commandSeq = Math.max(this.commandSeq, acked) + 1;
    this.pending = { ...command, seq: this.commandSeq };
    this.emit({ kind: 'command', data: this.pending });
    return this.pending;
  }

  status() {
    const online = this.latest !== null && this.now() - this.receivedAt <= ONLINE_WINDOW_MS;
    return {
      online,
      receivedAt: this.receivedAt ? new Date(this.receivedAt).toISOString() : null,
      snapshot: this.latest,
      pendingCommand: this.pending,
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
      sessionId: this.sessionId,
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
