import { Animation, Color3, Color4, Mesh, MeshBuilder, PickingInfo, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import { CITYGAME_GRID_SIZE } from '../config/world'
import { neighborhood, tileIdOf, tileOffsetMeters, tileSizeMeters } from '../geo/tileMath'
import { ProceduralBuildingFactory } from './models/ProceduralBuildingFactory'
import { NpcSystem, type NpcBounds } from './npc/NpcSystem'
import type { BuildingLevel, PlacedObject, TileClaim, TileCoord } from '../types'

const CONSTRUCTION_FPS = 30
const CONSTRUCTION_FRAMES = 22
const BULLDOZE_FRAMES = 12

const MAX_CARS_PER_TILE = 5
const MAX_PEDESTRIANS_PER_TILE = 6
const CAR_ID_PREFIX = 'car:'
const PEDESTRIAN_ID_PREFIX = 'ped:'

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
    /** cellKeys ("x:y") of placed roads/population buildings — drives how many NPCs this tile gets and where they roam. */
    roadCells: Set<string>
    populationCells: Set<string>
}

/**
 * Spatial partitioning for the render side: keeps one ground "plate" per
 * map tile within `radius` of the player's current tile, tears down plates
 * (and everything placed on them) once they fall out of range, and maps
 * pointer picks back to (tileId, cellX, cellY) for placement.
 *
 * Also owns the visual life-cycle of what's placed on those plates:
 * procedural building models (ProceduralBuildingFactory), a grow-in
 * animation on construction, a cross-fade on SimCity-style level-up, a
 * shrink-out on bulldoze, and autonomous cars/pedestrians (NpcSystem) sized
 * to how much road/population each tile currently has.
 */
export class TileStreamer {
    private tiles = new Map<string, TileEntry>()
    private origin: TileCoord
    private factory: ProceduralBuildingFactory
    private npcSystem: NpcSystem

    constructor(
        private scene: Scene,
        origin: TileCoord,
        private onMeshCreated?: (mesh: Mesh) => void,
    ) {
        this.origin = origin
        this.factory = new ProceduralBuildingFactory(scene, onMeshCreated)
        this.npcSystem = new NpcSystem(scene, onMeshCreated)
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
                this.disposeTile(id, entry)
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
        this.trackCell(entry, object.tool, cellKey, true)
    }

    applyObjectRemoved(payload: { tileId: string; cellX: number; cellY: number }) {
        const entry = this.tiles.get(payload.tileId)
        if (!entry) return
        const cellKey = `${payload.cellX}:${payload.cellY}`
        const node = entry.objectNodes.get(cellKey)
        if (!node) return
        entry.objectNodes.delete(cellKey)
        this.animateBulldoze(node)

        const tool = node.metadata?.tool as PlacedObject['tool'] | undefined
        if (tool) this.trackCell(entry, tool, cellKey, false)
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

        return { coord, root, plate, plateMat: mat, claim: null, objectNodes: new Map(), roadCells: new Set(), populationCells: new Set() }
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

        const node = this.factory.spawn(object.tool, object.level, cellSize, object.tileId, object.cellX, object.cellY)
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

    /** Updates a tile's road/population cell sets and re-syncs how many NPCs it should have. */
    private trackCell(entry: TileEntry, tool: PlacedObject['tool'], cellKey: string, added: boolean) {
        if (tool === 'road') {
            added ? entry.roadCells.add(cellKey) : entry.roadCells.delete(cellKey)
            this.syncTraffic(entry)
        } else if (tool === 'zone-residential' || tool === 'zone-commercial') {
            added ? entry.populationCells.add(cellKey) : entry.populationCells.delete(cellKey)
            this.syncPedestrians(entry)
        }
    }

    private syncTraffic(entry: TileEntry) {
        const tileId = tileIdOf(entry.coord)
        const desired = entry.roadCells.size === 0 ? 0 : Math.min(MAX_CARS_PER_TILE, Math.max(1, Math.floor(entry.roadCells.size / 2)))
        const existingIds = this.npcSystem.idsForTile(tileId, CAR_ID_PREFIX)

        if (desired === 0) {
            for (const id of existingIds) this.npcSystem.remove(id)
            return
        }

        const bounds = this.boundsForCells(entry, entry.roadCells)
        for (const id of existingIds) this.npcSystem.updateBounds(id, bounds)

        for (let i = existingIds.length; i < desired; i++) {
            this.npcSystem.spawnCar(`${CAR_ID_PREFIX}${tileId}:${i}`, tileId, entry.root, bounds, Math.random())
        }
        for (let i = desired; i < existingIds.length; i++) {
            this.npcSystem.remove(existingIds[i])
        }
    }

    private syncPedestrians(entry: TileEntry) {
        const tileId = tileIdOf(entry.coord)
        const desired =
            entry.populationCells.size === 0 ? 0 : Math.min(MAX_PEDESTRIANS_PER_TILE, Math.max(1, Math.floor(entry.populationCells.size / 2)))
        const existingIds = this.npcSystem.idsForTile(tileId, PEDESTRIAN_ID_PREFIX)

        if (desired === 0) {
            for (const id of existingIds) this.npcSystem.remove(id)
            return
        }

        const bounds = this.fullTileBounds(entry)
        for (const id of existingIds) this.npcSystem.updateBounds(id, bounds)

        for (let i = existingIds.length; i < desired; i++) {
            this.npcSystem.spawnPedestrian(`${PEDESTRIAN_ID_PREFIX}${tileId}:${i}`, tileId, entry.root, bounds, Math.random())
        }
        for (let i = desired; i < existingIds.length; i++) {
            this.npcSystem.remove(existingIds[i])
        }
    }

    /** Axis-aligned bounding box (in tile-local meters) of a set of "x:y" cell keys, so NPCs roam roughly where the cells actually are. */
    private boundsForCells(entry: TileEntry, cells: Set<string>): NpcBounds {
        const size = tileSizeMeters(entry.coord)
        const cellSize = size / CITYGAME_GRID_SIZE
        let minCellX = Infinity
        let maxCellX = -Infinity
        let minCellY = Infinity
        let maxCellY = -Infinity
        for (const key of cells) {
            const [xStr, yStr] = key.split(':')
            const x = Number(xStr)
            const y = Number(yStr)
            minCellX = Math.min(minCellX, x)
            maxCellX = Math.max(maxCellX, x)
            minCellY = Math.min(minCellY, y)
            maxCellY = Math.max(maxCellY, y)
        }
        return {
            minX: minCellX * cellSize - size / 2,
            maxX: (maxCellX + 1) * cellSize - size / 2,
            minZ: minCellY * cellSize - size / 2,
            maxZ: (maxCellY + 1) * cellSize - size / 2,
        }
    }

    private fullTileBounds(entry: TileEntry): NpcBounds {
        const size = tileSizeMeters(entry.coord)
        return { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: size / 2 }
    }

    private disposeTile(tileId: string, entry: TileEntry) {
        this.npcSystem.removeAllForTile(tileId)
        for (const node of entry.objectNodes.values()) node.dispose()
        entry.objectNodes.clear()
        entry.plate.dispose()
        entry.root.dispose()
    }

    dispose() {
        for (const [id, entry] of this.tiles) this.disposeTile(id, entry)
        this.tiles.clear()
        this.npcSystem.dispose()
    }
}
