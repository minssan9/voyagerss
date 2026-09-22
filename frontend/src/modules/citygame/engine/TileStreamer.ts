import { Color3, Color4, Mesh, MeshBuilder, PickingInfo, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import { CITYGAME_GRID_SIZE } from '../config/world'
import { neighborhood, tileIdOf, tileOffsetMeters, tileSizeMeters } from '../geo/tileMath'
import type { PlaceableTool, PlacedObject, TileClaim, TileCoord } from '../types'

const TOOL_STYLE: Record<PlaceableTool, { color: Color3; height: number; footprint: number }> = {
    'zone-residential': { color: new Color3(0.31, 0.78, 0.47), height: 3.2, footprint: 0.8 },
    'zone-commercial': { color: new Color3(0.22, 0.5, 0.96), height: 5.5, footprint: 0.8 },
    'zone-industrial': { color: new Color3(0.95, 0.6, 0.2), height: 2.2, footprint: 0.85 },
    road: { color: new Color3(0.3, 0.31, 0.33), height: 0.15, footprint: 1 },
}

const UNCLAIMED_COLOR = new Color3(0.65, 0.66, 0.68)
const CLAIMED_BY_OTHER_COLOR = new Color3(0.55, 0.72, 0.95)
const CLAIMED_BY_ME_COLOR = new Color3(0.65, 0.9, 0.6)

interface TileEntry {
    coord: TileCoord
    root: TransformNode
    plate: Mesh
    plateMat: StandardMaterial
    claim: TileClaim | null
    objectMeshes: Map<string, Mesh>
}

/**
 * Spatial partitioning for the render side: keeps one ground "plate" per
 * map tile within `radius` of the player's current tile, tears down plates
 * (and everything placed on them) once they fall out of range, and maps
 * pointer picks back to (tileId, cellX, cellY) for placement.
 */
export class TileStreamer {
    private tiles = new Map<string, TileEntry>()
    private origin: TileCoord

    constructor(
        private scene: Scene,
        origin: TileCoord,
        private onMeshCreated?: (mesh: Mesh) => void,
    ) {
        this.origin = origin
    }

    setOrigin(origin: TileCoord) {
        this.origin = origin
    }

    /** Returns the tile ids now in view after this sync. */
    syncNeighborhood(center: TileCoord, radius: number): string[] {
        const nextCoords = neighborhood(center, radius)
        const nextIds = new Set(nextCoords.map(tileIdOf))

        for (const [id, entry] of this.tiles) {
            if (!nextIds.has(id)) {
                this.disposeTile(entry)
                this.tiles.delete(id)
            }
        }

        for (const coord of nextCoords) {
            const id = tileIdOf(coord)
            if (!this.tiles.has(id)) {
                this.tiles.set(id, this.createTile(coord))
            }
        }

        return [...nextIds]
    }

    applyTileClaimed(claim: TileClaim) {
        const entry = this.tiles.get(claim.tileId)
        if (!entry) return
        entry.claim = claim
        this.restyleTile(entry, claim.ownerId)
    }

    applyObjectPlaced(object: PlacedObject) {
        const entry = this.tiles.get(object.tileId)
        if (!entry) return
        const cellKey = `${object.cellX}:${object.cellY}`
        if (entry.objectMeshes.has(cellKey)) return
        entry.objectMeshes.set(cellKey, this.buildObjectMesh(entry, object))
    }

    applyObjectRemoved(payload: { tileId: string; cellX: number; cellY: number }) {
        const entry = this.tiles.get(payload.tileId)
        if (!entry) return
        const cellKey = `${payload.cellX}:${payload.cellY}`
        const mesh = entry.objectMeshes.get(cellKey)
        mesh?.dispose()
        entry.objectMeshes.delete(cellKey)
    }

    /** Renders a full server snapshot for a tile (claim + all placed objects), used on first join. */
    applySnapshot(snapshot: { tileId: string; claim: TileClaim | null; objects: PlacedObject[] }, localOwnerId: string | undefined) {
        const entry = this.tiles.get(snapshot.tileId)
        if (!entry) return
        entry.claim = snapshot.claim
        this.restyleTile(entry, localOwnerId)
        for (const object of snapshot.objects) this.applyObjectPlaced(object)
    }

    /** Maps a Babylon pick (against a tile plate) back to the grid cell under the cursor. */
    pickCell(pick: PickingInfo): { tileId: string; cellX: number; cellY: number } | null {
        if (!pick.hit || !pick.pickedMesh || !pick.pickedPoint) return null
        const tileId = pick.pickedMesh.metadata?.tileId as string | undefined
        if (!tileId) return null
        const entry = this.tiles.get(tileId)
        if (!entry) return null

        const size = tileSizeMeters(entry.coord)
        const local = pick.pickedPoint.subtract(entry.root.position)
        const cellSize = size / CITYGAME_GRID_SIZE
        const cellX = Math.floor((local.x + size / 2) / cellSize)
        const cellY = Math.floor((local.z + size / 2) / cellSize)
        if (cellX < 0 || cellY < 0 || cellX >= CITYGAME_GRID_SIZE || cellY >= CITYGAME_GRID_SIZE) return null
        return { tileId, cellX, cellY }
    }

    getClaim(tileId: string): TileClaim | null {
        return this.tiles.get(tileId)?.claim ?? null
    }

    /** Finds which currently-rendered tile plate contains this world XZ position, if any. */
    resolveTileAt(worldX: number, worldZ: number): TileCoord | null {
        for (const entry of this.tiles.values()) {
            const size = tileSizeMeters(entry.coord)
            const half = size / 2
            const dx = worldX - entry.root.position.x
            const dz = worldZ - entry.root.position.z
            if (Math.abs(dx) <= half && Math.abs(dz) <= half) return entry.coord
        }
        return null
    }

    private createTile(coord: TileCoord): TileEntry {
        const id = tileIdOf(coord)
        const size = tileSizeMeters(coord)
        const offset = tileOffsetMeters(this.origin, coord)

        const root = new TransformNode(`tile-${id}`, this.scene)
        root.position = new Vector3(offset.x, 0.02, offset.z)

        const plate = MeshBuilder.CreateGround(`tile-plate-${id}`, { width: size, height: size }, this.scene)
        plate.parent = root
        plate.metadata = { tileId: id }
        plate.isPickable = true

        const mat = new StandardMaterial(`tile-mat-${id}`, this.scene)
        mat.diffuseColor = UNCLAIMED_COLOR
        mat.specularColor = Color3.Black()
        mat.alpha = 0.55
        plate.material = mat

        plate.enableEdgesRendering()
        plate.edgesWidth = 2
        plate.edgesColor = new Color4(1, 1, 1, 0.5)

        return { coord, root, plate, plateMat: mat, claim: null, objectMeshes: new Map() }
    }

    private restyleTile(entry: TileEntry, localOwnerId: string | undefined) {
        if (!entry.claim) {
            entry.plateMat.diffuseColor = UNCLAIMED_COLOR
        } else if (entry.claim.ownerId === localOwnerId) {
            entry.plateMat.diffuseColor = CLAIMED_BY_ME_COLOR
        } else {
            entry.plateMat.diffuseColor = CLAIMED_BY_OTHER_COLOR
        }
    }

    private buildObjectMesh(entry: TileEntry, object: PlacedObject): Mesh {
        const style = TOOL_STYLE[object.tool]
        const size = tileSizeMeters(entry.coord)
        const cellSize = size / CITYGAME_GRID_SIZE
        const footprint = cellSize * style.footprint

        const box = MeshBuilder.CreateBox(
            `obj-${object.id}`,
            { width: footprint, depth: footprint, height: style.height },
            this.scene,
        )
        box.parent = entry.root
        const localX = (object.cellX + 0.5) * cellSize - size / 2
        const localZ = (object.cellY + 0.5) * cellSize - size / 2
        box.position = new Vector3(localX, style.height / 2, localZ)

        const mat = new StandardMaterial(`obj-mat-${object.id}`, this.scene)
        mat.diffuseColor = style.color
        mat.specularColor = Color3.Black()
        box.material = mat
        box.receiveShadows = true
        this.onMeshCreated?.(box)

        return box
    }

    private disposeTile(entry: TileEntry) {
        for (const mesh of entry.objectMeshes.values()) mesh.dispose()
        entry.objectMeshes.clear()
        entry.plate.dispose()
        entry.root.dispose()
    }

    dispose() {
        for (const entry of this.tiles.values()) this.disposeTile(entry)
        this.tiles.clear()
    }
}
