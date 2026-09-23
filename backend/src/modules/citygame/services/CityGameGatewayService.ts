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
import {
  BULLDOZE_COST,
  ECONOMY_TICK_MS,
  FACILITY_TOOLS,
  FACILITY_UPKEEP,
  FURNITURE_PRICE,
  FURNITURE_SELL_RATIO,
  HOUSEHOLD_SALARY,
  LAND_PRICE,
  LAND_RESERVATION_MS,
  STARTING_HOUSEHOLD,
  STARTING_TREASURY,
  TOOL_COST,
  ZONE_TAX,
} from '../config/economy';
import type { BuildingLevel, BuildTool, CityAccount, FacilityTool, PlacedObject, TileClaim, TileSnapshot, ZoneTool } from '../types';

const TILE_ROOM_PREFIX = 'tile:';
const OWNER_ROOM_PREFIX = 'owner:';
const VALID_TOOLS = Object.keys(TOOL_COST) as BuildTool[];

type Ack<T> = (result: T) => void;
type ActionResult = { ok: true } | { ok: false; reason: string };

interface HelloPayload {
  ownerId: string;
  ownerName?: string;
}

interface ViewportUpdatePayload {
  tileId: string;
  radius?: number;
}

interface ClaimTilePayload {
  tileId: string;
  ownerName?: string;
  /** Stable client-generated id (see frontend's useGuestIdentity) — not socket.id, which changes on reconnect. */
  ownerId?: string;
}

interface PlaceObjectPayload {
  tileId: string;
  cellX: number;
  cellY: number;
  tool: BuildTool;
  ownerId?: string;
}

interface RemoveObjectPayload {
  tileId: string;
  cellX: number;
  cellY: number;
  ownerId?: string;
}

function isFacility(tool: BuildTool): tool is FacilityTool {
  return (FACILITY_TOOLS as BuildTool[]).includes(tool);
}

function isZone(tool: BuildTool): tool is ZoneTool {
  return tool in ZONE_TAX;
}

/**
 * Real-time multiplayer sync for the citygame module: one Socket.IO
 * namespace (`/citygame`), one room per map tile (`tile:<z>/<x>/<y>`) and
 * one per player (`owner:<ownerId>`, for account updates across tabs).
 *
 * Land works in two steps: claiming grants a time-limited reservation
 * (선점권) that only its holder can convert to ownership by paying the land
 * price; building is only allowed on owned land. Money is server-
 * authoritative: each player's city treasury pays for construction and
 * facility upkeep and collects zone taxes every economy tick, and a facility
 * whose upkeep the treasury can't cover stops operating (funded=false),
 * which every nearby player sees.
 *
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
  private accounts = new Map<string, CityAccount>();
  private growthTimer: NodeJS.Timeout | null = null;
  private economyTimer: NodeJS.Timeout | null = null;

  initialize(io: SocketIOServer): void {
    this.namespace = io.of('/citygame');
    this.startGrowthTicker();
    this.startEconomyTicker();

    this.namespace.on('connection', (socket: Socket) => {
      socket.data.subscribedTiles = new Set<string>();

      socket.on('session:hello', (payload: HelloPayload, ack?: Ack<CityAccount | null>) => {
        ack?.(this.handleHello(socket, payload));
      });

      socket.on('viewport:update', (payload: ViewportUpdatePayload, ack?: Ack<TileSnapshot[]>) => {
        ack?.(this.handleViewportUpdate(socket, payload));
      });

      socket.on('tile:claim', (payload: ClaimTilePayload) => this.handleClaimTile(socket, payload));

      socket.on('tile:purchase', (payload: { tileId: string; ownerId?: string }, ack?: Ack<ActionResult>) => {
        ack?.(this.handlePurchaseTile(socket, payload));
      });

      socket.on('object:place', (payload: PlaceObjectPayload) => this.handlePlaceObject(socket, payload));

      socket.on('object:remove', (payload: RemoveObjectPayload) => this.handleRemoveObject(socket, payload));

      socket.on('furniture:buy', (payload: { itemId: string; ownerId?: string }, ack?: Ack<ActionResult>) => {
        ack?.(this.handleFurnitureBuy(socket, payload));
      });

      socket.on('furniture:sell', (payload: { itemId: string; ownerId?: string }, ack?: Ack<ActionResult>) => {
        ack?.(this.handleFurnitureSell(socket, payload));
      });

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

  // ---- identity / accounts ----

  private handleHello(socket: Socket, payload: HelloPayload): CityAccount | null {
    const ownerId = this.cleanOwnerId(payload?.ownerId);
    if (!ownerId) return null;
    socket.data.ownerId = ownerId;
    socket.join(OWNER_ROOM_PREFIX + ownerId);
    return this.account(ownerId);
  }

  /** Every mutating event resolves the caller the same way: the id bound by session:hello wins over a payload id. */
  private resolveOwner(socket: Socket, payloadOwnerId?: string): string {
    return (socket.data.ownerId as string | undefined) ?? this.cleanOwnerId(payloadOwnerId) ?? socket.id;
  }

  private cleanOwnerId(raw: unknown): string | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    return raw.trim().slice(0, 100);
  }

  private account(ownerId: string): CityAccount {
    let account = this.accounts.get(ownerId);
    if (!account) {
      account = {
        ownerId,
        treasury: STARTING_TREASURY,
        household: STARTING_HOUSEHOLD,
        lastIncome: 0,
        lastUpkeep: 0,
        lastSalary: 0,
        unfundedFacilities: 0,
        furniture: {},
      };
      this.accounts.set(ownerId, account);
    }
    return account;
  }

  private emitAccount(ownerId: string): void {
    this.namespace?.to(OWNER_ROOM_PREFIX + ownerId).emit('account:update', this.account(ownerId));
  }

  // ---- viewport ----

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

  // ---- land: reserve (선점) → purchase ----

  private handleClaimTile(socket: Socket, payload: ClaimTilePayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    const tid = toTileId(coord);
    const ownerId = this.resolveOwner(socket, payload.ownerId);

    this.expireReservations();
    if (this.claims.has(tid)) {
      socket.emit('tile:claim-rejected', { tileId: tid, reason: 'already-claimed' });
      return;
    }
    // One open reservation per player, so nobody can sit on a whole neighborhood without paying.
    for (const claim of this.claims.values()) {
      if (claim.ownerId === ownerId && claim.status === 'reserved') {
        socket.emit('tile:claim-rejected', { tileId: tid, reason: 'reservation-limit' });
        return;
      }
    }

    const now = Date.now();
    const claim: TileClaim = {
      tileId: tid,
      ownerId,
      ownerName: (payload.ownerName || 'Player').slice(0, 40),
      claimedAt: now,
      status: 'reserved',
      reservedUntil: now + LAND_RESERVATION_MS,
      price: LAND_PRICE,
    };
    this.claims.set(tid, claim);
    this.namespace?.to(TILE_ROOM_PREFIX + tid).emit('tile:claimed', claim);
    // The claimer may not be subscribed to this tile's room yet (claim fired before the first viewport sync lands).
    socket.emit('tile:claimed', claim);
  }

  private handlePurchaseTile(socket: Socket, payload: { tileId: string; ownerId?: string }): ActionResult {
    const coord = parseTileId(payload?.tileId);
    if (!coord) return { ok: false, reason: 'invalid-tile' };
    const tid = toTileId(coord);
    const ownerId = this.resolveOwner(socket, payload.ownerId);

    this.expireReservations();
    const claim = this.claims.get(tid);
    if (!claim) return { ok: false, reason: 'not-reserved' };
    if (claim.ownerId !== ownerId) return { ok: false, reason: 'reserved-by-other' };
    if (claim.status === 'owned') return { ok: false, reason: 'already-owned' };

    const account = this.account(ownerId);
    if (account.household < claim.price) return { ok: false, reason: 'insufficient-funds' };

    account.household -= claim.price;
    claim.status = 'owned';
    claim.reservedUntil = null;

    this.namespace?.to(TILE_ROOM_PREFIX + tid).emit('tile:claimed', claim);
    socket.emit('tile:claimed', claim);
    this.emitAccount(ownerId);
    return { ok: true };
  }

  private expireReservations(): void {
    const now = Date.now();
    for (const [tid, claim] of this.claims) {
      if (claim.status === 'reserved' && claim.reservedUntil !== null && claim.reservedUntil <= now) {
        this.claims.delete(tid);
        this.namespace?.to(TILE_ROOM_PREFIX + tid).emit('tile:released', { tileId: tid });
        this.namespace?.to(OWNER_ROOM_PREFIX + claim.ownerId).emit('tile:released', { tileId: tid });
      }
    }
  }

  // ---- building ----

  private handlePlaceObject(socket: Socket, payload: PlaceObjectPayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    const tid = toTileId(coord);
    const reject = (reason: string): void => {
      socket.emit('object:rejected', { tileId: tid, cellX: payload.cellX, cellY: payload.cellY, reason });
    };

    if (!VALID_TOOLS.includes(payload.tool)) return reject('invalid-tool');
    if (!Number.isInteger(payload.cellX) || !Number.isInteger(payload.cellY)) return reject('invalid-cell');
    if (payload.cellX < 0 || payload.cellY < 0 || payload.cellX >= CITYGAME_GRID_SIZE || payload.cellY >= CITYGAME_GRID_SIZE) {
      return reject('invalid-cell');
    }

    const ownerId = this.resolveOwner(socket, payload.ownerId);
    const claim = this.claims.get(tid);
    if (!claim || claim.status !== 'owned') return reject('tile-not-owned');
    if (claim.ownerId !== ownerId) return reject('not-your-tile');

    const tileObjects = this.objects.get(tid) ?? new Map<string, PlacedObject>();
    const cellKey = `${payload.cellX}:${payload.cellY}`;
    if (tileObjects.has(cellKey)) return reject('cell-occupied');
    if (payload.tool === 'home' && [...tileObjects.values()].some((o) => o.tool === 'home')) return reject('home-exists');

    const account = this.account(ownerId);
    const cost = TOOL_COST[payload.tool];
    if (account.treasury < cost) return reject('insufficient-funds');
    account.treasury -= cost;

    const object: PlacedObject = {
      id: `${tid}:${cellKey}`,
      tileId: tid,
      cellX: payload.cellX,
      cellY: payload.cellY,
      tool: payload.tool,
      level: 1,
      ownerId,
      createdAt: Date.now(),
      ...(isFacility(payload.tool) ? { funded: true } : {}),
    };

    tileObjects.set(cellKey, object);
    this.objects.set(tid, tileObjects);

    socket.emit('object:ack', object);
    socket.to(TILE_ROOM_PREFIX + tid).emit('object:placed', object);
    this.emitAccount(ownerId);
  }

  private handleRemoveObject(socket: Socket, payload: RemoveObjectPayload): void {
    const coord = parseTileId(payload.tileId);
    if (!coord) return;
    const tid = toTileId(coord);
    const cellKey = `${payload.cellX}:${payload.cellY}`;
    const tileObjects = this.objects.get(tid);
    const object = tileObjects?.get(cellKey);
    if (!tileObjects || !object) return;

    // Only the tile's owner can demolish on it — previously anyone could bulldoze anyone's city.
    const ownerId = this.resolveOwner(socket, payload.ownerId);
    const claim = this.claims.get(tid);
    if (!claim || claim.ownerId !== ownerId) {
      socket.emit('object:remove-rejected', { tileId: tid, cellX: payload.cellX, cellY: payload.cellY, reason: 'not-your-tile' });
      return;
    }
    const account = this.account(ownerId);
    if (account.treasury < BULLDOZE_COST) {
      socket.emit('object:remove-rejected', { tileId: tid, cellX: payload.cellX, cellY: payload.cellY, reason: 'insufficient-funds' });
      return;
    }
    account.treasury -= BULLDOZE_COST;

    tileObjects.delete(cellKey);
    const removed = { tileId: tid, cellX: payload.cellX, cellY: payload.cellY };
    socket.emit('object:remove-ack', removed);
    socket.to(TILE_ROOM_PREFIX + tid).emit('object:removed', removed);
    this.emitAccount(ownerId);
  }

  // ---- household: furniture ----

  private handleFurnitureBuy(socket: Socket, payload: { itemId: string; ownerId?: string }): ActionResult {
    const price = FURNITURE_PRICE[payload?.itemId];
    if (price === undefined) return { ok: false, reason: 'unknown-item' };
    const ownerId = this.resolveOwner(socket, payload.ownerId);
    const account = this.account(ownerId);
    if (account.household < price) return { ok: false, reason: 'insufficient-funds' };

    account.household -= price;
    account.furniture[payload.itemId] = (account.furniture[payload.itemId] ?? 0) + 1;
    this.emitAccount(ownerId);
    return { ok: true };
  }

  /** Refunds only items this account actually bought, so a client can't mint money by "selling" things it never paid for. */
  private handleFurnitureSell(socket: Socket, payload: { itemId: string; ownerId?: string }): ActionResult {
    const price = FURNITURE_PRICE[payload?.itemId];
    if (price === undefined) return { ok: false, reason: 'unknown-item' };
    const ownerId = this.resolveOwner(socket, payload.ownerId);
    const account = this.account(ownerId);
    const owned = account.furniture[payload.itemId] ?? 0;
    if (owned <= 0) return { ok: false, reason: 'not-owned' };

    account.furniture[payload.itemId] = owned - 1;
    account.household += Math.floor(price * FURNITURE_SELL_RATIO);
    this.emitAccount(ownerId);
    return { ok: true };
  }

  // ---- snapshots / presence ----

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

  // ---- simulation ticks ----

  /**
   * Simplified stand-in for SimCity's RCI/land-value simulation: every tick,
   * each zone building below max level has a flat chance to grow one stage.
   * No demand model, no neighbor effects — just enough to make placed zones
   * visibly develop over time (and pay more tax as they do).
   */
  private startGrowthTicker(): void {
    if (this.growthTimer) return;
    this.growthTimer = setInterval(() => this.tickGrowth(), CITYGAME_GROWTH_TICK_MS);
  }

  tickGrowth(): void {
    for (const [tid, tileObjects] of this.objects) {
      for (const object of tileObjects.values()) {
        if (!isZone(object.tool)) continue;
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

  private startEconomyTicker(): void {
    if (this.economyTimer) return;
    this.economyTimer = setInterval(() => this.tickEconomy(), ECONOMY_TICK_MS);
  }

  /**
   * One city "month": each player's zones pay tax into their treasury, then
   * their facilities draw upkeep oldest-first. Once the treasury can't cover
   * a facility it goes unfunded (stops operating) until a later month can
   * pay for it again — the funded flag is broadcast to everyone viewing that
   * tile, since facilities affect every nearby home, not just the owner's.
   */
  tickEconomy(): void {
    this.expireReservations();

    const byOwner = new Map<string, PlacedObject[]>();
    for (const tileObjects of this.objects.values()) {
      for (const object of tileObjects.values()) {
        const list = byOwner.get(object.ownerId) ?? [];
        list.push(object);
        byOwner.set(object.ownerId, list);
      }
    }

    for (const [ownerId, objects] of byOwner) {
      const account = this.account(ownerId);

      let income = 0;
      for (const object of objects) {
        if (isZone(object.tool)) income += ZONE_TAX[object.tool][object.level - 1];
      }
      account.treasury += income;

      let upkeep = 0;
      let unfunded = 0;
      const facilities = objects.filter((o) => isFacility(o.tool)).sort((a, b) => a.createdAt - b.createdAt);
      for (const facility of facilities) {
        const cost = FACILITY_UPKEEP[facility.tool as FacilityTool];
        const funded = account.treasury >= cost;
        if (funded) {
          account.treasury -= cost;
          upkeep += cost;
        } else {
          unfunded++;
        }
        if (facility.funded !== funded) {
          facility.funded = funded;
          this.namespace?.to(TILE_ROOM_PREFIX + facility.tileId).emit('object:funding', {
            tileId: facility.tileId,
            cellX: facility.cellX,
            cellY: facility.cellY,
            funded,
          });
        }
      }

      const hasHome = objects.some((o) => o.tool === 'home');
      const salary = hasHome ? HOUSEHOLD_SALARY : 0;
      account.household += salary;

      account.lastIncome = income;
      account.lastUpkeep = upkeep;
      account.lastSalary = salary;
      account.unfundedFacilities = unfunded;
      this.emitAccount(ownerId);
    }
  }

  dispose(): void {
    if (this.growthTimer) {
      clearInterval(this.growthTimer);
      this.growthTimer = null;
    }
    if (this.economyTimer) {
      clearInterval(this.economyTimer);
      this.economyTimer = null;
    }
  }
}

export const cityGameGatewayService = new CityGameGatewayService();
