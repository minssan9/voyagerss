import { io, Socket } from 'socket.io-client'
import type { BuildingLevel, PlaceableTool, PlacedObject, TileClaim, TileSnapshot } from '../types'

export interface CityGameSocketEvents {
    onConnected?: () => void
    onDisconnected?: () => void
    onTileClaimed?: (claim: TileClaim) => void
    onClaimRejected?: (payload: { tileId: string; reason: string }) => void
    onObjectPlaced?: (object: PlacedObject) => void
    onObjectRejected?: (payload: { tileId: string; reason: string }) => void
    onObjectRemoved?: (payload: { tileId: string; cellX: number; cellY: number }) => void
    onObjectUpgraded?: (payload: { tileId: string; cellX: number; cellY: number; level: BuildingLevel }) => void
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
     * `ownerId` is a stable, client-generated id (see useGuestIdentity) sent
     * with every claim/place call — deliberately NOT `this.socket.id`.
     * Socket.IO reassigns `.id` on every reconnect, so using it as the
     * ownership key would make a client lose recognition of its own claimed
     * tile after any network blip.
     */
    constructor(
        private ownerId: string,
        events: CityGameSocketEvents = {},
    ) {
        this.socket = io('/citygame', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        })

        this.socket.on('connect', () => events.onConnected?.())
        this.socket.on('disconnect', () => events.onDisconnected?.())
        this.socket.on('tile:claimed', (claim: TileClaim) => events.onTileClaimed?.(claim))
        this.socket.on('tile:claim-rejected', (payload) => events.onClaimRejected?.(payload))
        this.socket.on('object:placed', (object: PlacedObject) => events.onObjectPlaced?.(object))
        this.socket.on('object:ack', (object: PlacedObject) => events.onObjectPlaced?.(object))
        this.socket.on('object:rejected', (payload) => events.onObjectRejected?.(payload))
        this.socket.on('object:removed', (payload) => events.onObjectRemoved?.(payload))
        this.socket.on('object:remove-ack', (payload) => events.onObjectRemoved?.(payload))
        this.socket.on('object:upgraded', (payload) => events.onObjectUpgraded?.(payload))
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

    claimTile(tileId: string, ownerName: string) {
        this.socket.emit('tile:claim', { tileId, ownerName, ownerId: this.ownerId })
    }

    placeObject(payload: { tileId: string; cellX: number; cellY: number; tool: PlaceableTool }) {
        this.socket.emit('object:place', { ...payload, ownerId: this.ownerId })
    }

    removeObject(payload: { tileId: string; cellX: number; cellY: number }) {
        this.socket.emit('object:remove', payload)
    }

    dispose() {
        this.socket.disconnect()
    }
}
