import { Injectable } from '@nestjs/common';
import { Namespace, Server as SocketIOServer, Socket } from 'socket.io';
import { neighborhood, parseTileId, tileId as toTileId } from '../geo/tileMath';
import {
  CITYGAME_DEFAULT_NEIGHBOR_RADIUS,
  CITYGAME_GRID_SIZE,
  CITYGAME_GROWTH_CHANCE,
  CITYGAME_GROWTH_TICK_MS,
  CITYGAME_MAX_BUILDING_LEVEL,
  CITYGAME_MAX_NEIGHBOR_RADIUS,
} from '../config/world';
import type { BuildingLevel, BuildTool, PlacedObject, TileClaim, TileSnapshot } from '../types';

const TILE_ROOM_PREFIX = 'tile:';
const VALID_TOOLS: BuildTool[] = ['zone-residential', 'zone-commercial', 'zone-industrial', 'road'];

interface ViewportUpdatePayload {
  tileId: string;
  radius?: number;
}

interface ClaimTilePayload {
  tileId: string;
  ownerName?: string;
}

interface PlaceObjectPayload {
  tileId: string;
  cellX: number;
  cellY: number;
  tool: BuildTool;
}

interface RemoveObjectPayload {
  tileId: string;
  cellX: number;
  cellY: number;
}

/**
 * Real-time multiplayer sync for the citygame module: one Socket.IO
 * namespace (`/citygame`), one room per map tile (`tile:<z>/<x>/<y>`).
 * State is kept in-memory per backend process — good enough for a single
 * instance; a follow-up phase should back this with Postgres/Supabase (see
 * prisma/citygame.prisma) plus a shared adapter (e.g. Redis) once this runs
 * behind more than one instance.
 */
@Injectable()
export class CityGameGatewayService {
  private namespace: Namespace | null = null;
  private claims = new Map<string, TileClaim>();
  private objects = new Map<string, Map<string, PlacedObject>>();
  private growthTimer: NodeJS.Timeout | null = null;

  initialize(io: SocketIOServer): void {
    this.namespace = io.of('/citygame');
    this.startGrowthTicker();

    this.namespace.on('connection', (socket: Socket) => {
      socket.data.subscribedTiles = new Set<string>();

      socket.on('viewport:update', (payload: ViewportUpdatePayload, ack?: (snapshots: TileSnapshot[]) => void) => {
        const snapshots = this.handleViewportUpdate(socket, payload);
        ack?.(snapshots);
      });

      socket.on('tile:claim', (payload: ClaimTilePayload) => this.handleClaimTile(socket, payload));

      socket.on('object:place', (payload: PlaceObjectPayload) => this.handlePlaceObject(socket, payload));

      socket.on('object:remove', (payload: RemoveObjectPayload) => this.handleRemoveObject(socket, payload));

      socket.on('disconnecting', () => {
        // `disconnecting` fires before Socket.IO removes the socket from its
        // rooms, so the room size read inside emitPresence would still
        // include this socket — pass pendingSelfLeave to correct for it.
        for (const room of socket.rooms) {
          if (room.startsWith(TILE_ROOM_PREFIX)) this.emitPresence(room, true);
        }
      });
    });

    console.log('[CityGame] /citygame namespace initialized');
  }

  private handleViewportUpdate(socket: Socket, payload: ViewportUpdatePayload): TileSnapshot[] {
    const center = parseTileId(payload.tileId);
    if (!center) return [];

    const radius = Math.min(payload.radius ?? CITYGAME_DEFAULT_NEIGHBOR_RADIUS, CITYGAME_MAX_NEIGHBOR_RADIUS);
    const nextTiles = new Set(neighborhood(center, radius));
    const prevTiles: Set<string> = socket.data.subscribedTiles;

    for (const tid of prevTiles) {
      if (!nextTiles.has(tid)) {
        socket.leave(TILE_ROOM_PREFIX + tid);
        this.emitPresence(TILE_ROOM_PREFIX + tid, false);
      }
    }
    for (const tid of nextTiles) {
      if (!prevTiles.has(tid)) {
        socket.join(TILE_ROOM_PREFIX + tid);
        this.emitPresence(TILE_ROOM_PREFIX + tid, false);
      }
    }
    socket.data.subscribedTiles = nextTiles;

    return [...nextTiles].map((tid) => this.snapshot(tid));
  }

  private handleClaimTile(socket: Socket, payload: ClaimTilePayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    const tid = toTileId(coord);

    if (this.claims.has(tid)) {
      socket.emit('tile:claim-rejected', { tileId: tid, reason: 'already-claimed' });
      return;
    }

    const claim: TileClaim = {
      tileId: tid,
      ownerId: socket.id,
      ownerName: (payload.ownerName || 'Player').slice(0, 40),
      claimedAt: Date.now(),
    };
    this.claims.set(tid, claim);
    this.namespace?.to(TILE_ROOM_PREFIX + tid).emit('tile:claimed', claim);
  }

  private handlePlaceObject(socket: Socket, payload: PlaceObjectPayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    if (!VALID_TOOLS.includes(payload.tool)) return;
    if (!Number.isInteger(payload.cellX) || !Number.isInteger(payload.cellY)) return;
    if (payload.cellX < 0 || payload.cellY < 0 || payload.cellX >= CITYGAME_GRID_SIZE || payload.cellY >= CITYGAME_GRID_SIZE) return;

    const tid = toTileId(coord);
    if (!this.claims.has(tid)) {
      socket.emit('object:rejected', { tileId: tid, reason: 'tile-unclaimed' });
      return;
    }

    const cellKey = `${payload.cellX}:${payload.cellY}`;
    const object: PlacedObject = {
      id: `${tid}:${cellKey}`,
      tileId: tid,
      cellX: payload.cellX,
      cellY: payload.cellY,
      tool: payload.tool,
      level: 1,
      ownerId: socket.id,
      createdAt: Date.now(),
    };

    if (!this.objects.has(tid)) this.objects.set(tid, new Map());
    this.objects.get(tid)!.set(cellKey, object);

    socket.emit('object:ack', object);
    socket.to(TILE_ROOM_PREFIX + tid).emit('object:placed', object);
  }

  private handleRemoveObject(socket: Socket, payload: RemoveObjectPayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    const tid = toTileId(coord);
    const cellKey = `${payload.cellX}:${payload.cellY}`;
    const tileObjects = this.objects.get(tid);
    if (!tileObjects?.has(cellKey)) return;

    tileObjects.delete(cellKey);
    const removed = { tileId: tid, cellX: payload.cellX, cellY: payload.cellY };
    socket.emit('object:remove-ack', removed);
    socket.to(TILE_ROOM_PREFIX + tid).emit('object:removed', removed);
  }

  private snapshot(tid: string): TileSnapshot {
    const room = this.namespace?.adapter.rooms.get(TILE_ROOM_PREFIX + tid);
    return {
      tileId: tid,
      claim: this.claims.get(tid) ?? null,
      objects: [...(this.objects.get(tid)?.values() ?? [])],
      occupantCount: room?.size ?? 0,
    };
  }

  private emitPresence(room: string, pendingSelfLeave: boolean): void {
    const tid = room.slice(TILE_ROOM_PREFIX.length);
    const rawCount = this.namespace?.adapter.rooms.get(room)?.size ?? 0;
    const occupantCount = pendingSelfLeave ? Math.max(0, rawCount - 1) : rawCount;
    this.namespace?.to(room).emit('presence:update', { tileId: tid, occupantCount });
  }

  /**
   * Simplified stand-in for SimCity's RCI/land-value simulation: every tick,
   * each non-road building below max level has a flat chance to grow one
   * stage. No demand model, no neighbor effects — just enough to make
   * placed zones visibly develop over time.
   */
  private startGrowthTicker(): void {
    if (this.growthTimer) return;
    this.growthTimer = setInterval(() => this.tickGrowth(), CITYGAME_GROWTH_TICK_MS);
  }

  private tickGrowth(): void {
    for (const [tid, tileObjects] of this.objects) {
      for (const object of tileObjects.values()) {
        if (object.tool === 'road') continue;
        if (object.level >= CITYGAME_MAX_BUILDING_LEVEL) continue;
        if (Math.random() >= CITYGAME_GROWTH_CHANCE) continue;

        object.level = (object.level + 1) as BuildingLevel;
        this.namespace?.to(TILE_ROOM_PREFIX + tid).emit('object:upgraded', {
          tileId: tid,
          cellX: object.cellX,
          cellY: object.cellY,
          level: object.level,
        });
      }
    }
  }

  dispose(): void {
    if (this.growthTimer) {
      clearInterval(this.growthTimer);
      this.growthTimer = null;
    }
  }
}

export const cityGameGatewayService = new CityGameGatewayService();
