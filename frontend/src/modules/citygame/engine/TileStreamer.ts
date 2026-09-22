import { Animation, Color3, Color4, Mesh, MeshBuilder, PickingInfo, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import { CITYGAME_GRID_SIZE } from '../config/world'
import { neighborhood, tileIdOf, tileOffsetMeters, tileSizeMeters } from '../geo/tileMath'
import { ProceduralBuildingFactory } from './models/ProceduralBuildingFactory'
import type { BuildingLevel, PlacedObject, TileClaim, TileCoord } from '../types'

const CONSTRUCTION_FPS = 30
const CONSTRUCTION_FRAMES = 22
const BULLDOZE_FRAMES = 12

const UNCLAIMED_COLOR = new Color3(0.65, 0.66, 0.68)
const CLAIMED_BY_OTHER_COLOR = new Color3(0.55, 0.72, 0.95)
const CLAIMED_BY_ME_COLOR = new Color3(0.65, 0.9, 0.6)

interface TileEntry {
    coord: TileCoord
    root: TransformNode
    plate: Mesh
    plateMat: StandardMaterial
    claim: TileClaim | null
    objectNodes: Map<string, TransformNode>
}

/**
 * Spatial partitioning for the render side: keeps one ground "plate" per
 * map tile within `radius` of the player's current tile, tears down plates
 * (and everything placed on them) once they fall out of range, and maps
 * pointer picks back to (tileId, cellX, cellY) for placement.
 *
 * Also owns the visual life-cycle of what's placed on those plates:
 * procedural building models (ProceduralBuildingFactory), a grow-in
 * animation on construction, a cross-fade on SimCity-style level-up, and a
 * shrink-out on bulldoze.
 */
export class TileStreamer {
    private tiles = new Map<string, TileEntry>()
    private origin: TileCoord
    private factory: ProceduralBuildingFactory

    constructor(
        private scene: Scene,
        origin: TileCoord,
        private onMeshCreated?: (mesh: Mesh) => void,
    ) {
        this.origin = origin
        this.factory = new ProceduralBuildingFactory(scene, onMeshCreated)
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
        if (entry.objectNodes.has(cellKey)) return
        const node = this.buildObjectNode(entry, object)
        entry.objectNodes.set(cellKey, node)
        this.animateConstruction(node)
    }

    applyObjectRemoved(payload: { tileId: string; cellX: number; cellY: number }) {
        const entry = this.tiles.get(payload.tileId)
        if (!entry) return
        const cellKey = `${payload.cellX}:${payload.cellY}`
        const node = entry.objectNodes.get(cellKey)
        if (!node) return
        entry.objectNodes.delete(cellKey)
        this.animateBulldoze(node)
    }

    /** SimCity-style growth: swap in the next-level model with a quick cross-fade instead of an instant pop. */
    applyObjectUpgraded(payload: { tileId: string; cellX: number; cellY: number; level: BuildingLevel; tool?: PlacedObject['tool'] }) {
        const entry = this.tiles.get(payload.tileId)
        if (!entry) return
        const cellKey = `${payload.cellX}:${payload.cellY}`
        const oldNode = entry.objectNodes.get(cellKey)
        const tool = payload.tool ?? (oldNode?.metadata?.tool as PlacedObject['tool'] | undefined)
        if (!tool) return

        if (oldNode) this.animateBulldoze(oldNode, 8)
        const newNode = this.buildObjectNode(entry, {
            id: `${payload.tileId}:${cellKey}`,
            tileId: payload.tileId,
            cellX: payload.cellX,
            cellY: payload.cellY,
            tool,
            level: payload.level,
            ownerId: oldNode?.metadata?.ownerId ?? 'unknown',
            createdAt: Date.now(),
        })
        entry.objectNodes.set(cellKey, newNode)
        this.animateConstruction(newNode)
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

        return { coord, root, plate, plateMat: mat, claim: null, objectNodes: new Map() }
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

    private buildObjectNode(entry: TileEntry, object: PlacedObject): TransformNode {
        const size = tileSizeMeters(entry.coord)
        const cellSize = size / CITYGAME_GRID_SIZE

        const node = this.factory.spawn(object.tool, object.level, cellSize)
        node.parent = entry.root
        const localX = (object.cellX + 0.5) * cellSize - size / 2
        const localZ = (object.cellY + 0.5) * cellSize - size / 2
        node.position = new Vector3(localX, 0, localZ)
        node.metadata = { tool: object.tool, ownerId: object.ownerId, level: object.level }

        return node
    }

    /** Grows a freshly-placed (or upgraded) building from nothing, easing past 100% for a small "pop". */
    private animateConstruction(node: TransformNode) {
        const target = node.scaling.clone()
        node.scaling.set(0.01, 0.01, 0.01)

        const anim = new Animation('construct', 'scaling', CONSTRUCTION_FPS, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
        anim.setKeys([
            { frame: 0, value: new Vector3(0.01, 0.01, 0.01) },
            { frame: CONSTRUCTION_FRAMES * 0.75, value: target.scale(1.06) },
            { frame: CONSTRUCTION_FRAMES, value: target },
        ])
        this.scene.beginDirectAnimation(node, [anim], 0, CONSTRUCTION_FRAMES, false)
    }

    /** Shrinks a building out before disposing it — used for bulldoze and for the old model on a level-up swap. */
    private animateBulldoze(node: TransformNode, frames: number = BULLDOZE_FRAMES) {
        const start = node.scaling.clone()
        const anim = new Animation('bulldoze', 'scaling', CONSTRUCTION_FPS, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CONSTANT)
        anim.setKeys([
            { frame: 0, value: start },
            { frame: frames, value: new Vector3(0.01, 0.01, 0.01) },
        ])
        this.scene.beginDirectAnimation(node, [anim], 0, frames, false, 1, () => node.dispose())
    }

    private disposeTile(entry: TileEntry) {
        for (const node of entry.objectNodes.values()) node.dispose()
        entry.objectNodes.clear()
        entry.plate.dispose()
        entry.root.dispose()
    }

    dispose() {
        for (const entry of this.tiles.values()) this.disposeTile(entry)
        this.tiles.clear()
    }
}
