import { io, Socket } from 'socket.io-client'
import type { BuildingLevel, CityAccount, PlaceableTool, PlacedObject, TileClaim, TileSnapshot } from '../types'

type CellRef = { tileId: string; cellX: number; cellY: number }
export type ActionResult = { ok: true } | { ok: false; reason: string }

export interface CityGameSocketEvents {
    onConnected?: () => void
    onDisconnected?: () => void
    onAccount?: (account: CityAccount) => void
    onTileClaimed?: (claim: TileClaim) => void
    onTileReleased?: (payload: { tileId: string }) => void
    onClaimRejected?: (payload: { tileId: string; reason: string }) => void
    onObjectPlaced?: (object: PlacedObject) => void
    onObjectRejected?: (payload: CellRef & { reason: string }) => void
    onObjectRemoved?: (payload: CellRef) => void
    onRemoveRejected?: (payload: CellRef & { reason: string }) => void
    onObjectUpgraded?: (payload: CellRef & { level: BuildingLevel }) => void
    onObjectFunding?: (payload: CellRef & { funded: boolean }) => void
    onPresenceUpdate?: (payload: { tileId: string; occupantCount: number }) => void
}

/**
 * Thin wrapper around the socket.io-client connection to the backend's
 * `/citygame` namespace. Connects same-origin so the existing dev-server
 * proxy (`/socket.io` -> backend) and production nginx config work with no
 * changes.
 */
export class CityGameSocket {
    private socket: Socket

    /**
     * `ownerId` is a stable, client-generated id (see useGuestIdentity),
     * bound to the connection via `session:hello` on every (re)connect —
     * deliberately NOT `this.socket.id`, which Socket.IO reassigns on every
     * reconnect and would make a client lose its own land and wallet.
     */
    constructor(
        private ownerId: string,
        private ownerName: string,
        events: CityGameSocketEvents = {},
    ) {
        this.socket = io('/citygame', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        })

        this.socket.on('connect', () => {
            this.socket.emit('session:hello', { ownerId, ownerName }, (account: CityAccount | null) => {
                if (account) events.onAccount?.(account)
                events.onConnected?.()
            })
        })
        this.socket.on('disconnect', () => events.onDisconnected?.())
        this.socket.on('account:update', (account: CityAccount) => events.onAccount?.(account))
        this.socket.on('tile:claimed', (claim: TileClaim) => events.onTileClaimed?.(claim))
        this.socket.on('tile:released', (payload) => events.onTileReleased?.(payload))
        this.socket.on('tile:claim-rejected', (payload) => events.onClaimRejected?.(payload))
        this.socket.on('object:placed', (object: PlacedObject) => events.onObjectPlaced?.(object))
        this.socket.on('object:ack', (object: PlacedObject) => events.onObjectPlaced?.(object))
        this.socket.on('object:rejected', (payload) => events.onObjectRejected?.(payload))
        this.socket.on('object:removed', (payload) => events.onObjectRemoved?.(payload))
        this.socket.on('object:remove-ack', (payload) => events.onObjectRemoved?.(payload))
        this.socket.on('object:remove-rejected', (payload) => events.onRemoveRejected?.(payload))
        this.socket.on('object:upgraded', (payload) => events.onObjectUpgraded?.(payload))
        this.socket.on('object:funding', (payload) => events.onObjectFunding?.(payload))
        this.socket.on('presence:update', (payload) => events.onPresenceUpdate?.(payload))
    }

    get connected(): boolean {
        return this.socket.connected
    }

    /** Tells the server which tile the camera is centered on; resolves with a full snapshot of every tile now in range. */
    updateViewport(tileId: string, radius: number): Promise<TileSnapshot[]> {
        return new Promise((resolve) => {
            this.socket.emit('viewport:update', { tileId, radius }, (snapshots: TileSnapshot[]) => {
                resolve(snapshots ?? [])
            })
        })
    }

    /** Takes a time-limited reservation (선점권) on the tile; buy it with `purchaseTile` before it lapses. */
    claimTile(tileId: string) {
        this.socket.emit('tile:claim', { tileId, ownerName: this.ownerName, ownerId: this.ownerId })
    }

    purchaseTile(tileId: string): Promise<ActionResult> {
        return this.request('tile:purchase', { tileId, ownerId: this.ownerId })
    }

    placeObject(payload: { tileId: string; cellX: number; cellY: number; tool: PlaceableTool }) {
        this.socket.emit('object:place', { ...payload, ownerId: this.ownerId })
    }

    removeObject(payload: CellRef) {
        this.socket.emit('object:remove', { ...payload, ownerId: this.ownerId })
    }

    buyFurniture(itemId: string): Promise<ActionResult> {
        return this.request('furniture:buy', { itemId, ownerId: this.ownerId })
    }

    sellFurniture(itemId: string): Promise<ActionResult> {
        return this.request('furniture:sell', { itemId, ownerId: this.ownerId })
    }

    private request(event: string, payload: unknown): Promise<ActionResult> {
        return new Promise((resolve) => {
            if (!this.socket.connected) {
                resolve({ ok: false, reason: 'offline' })
                return
            }
            this.socket.timeout(5000).emit(event, payload, (err: Error | null, result: ActionResult) => {
                resolve(err ? { ok: false, reason: 'timeout' } : result)
            })
        })
    }

    dispose() {
        this.socket.disconnect()
    }
}
