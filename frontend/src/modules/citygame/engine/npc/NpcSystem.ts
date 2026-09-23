import { Color3, Color4, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'

export interface NpcBounds {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
}

type NpcMode = 'move' | 'idle'

interface Npc {
    id: string
    tileId: string
    node: TransformNode
    heading: number
    speed: number
    mode: NpcMode
    timer: number
    bounds: NpcBounds
    height: number
}

const CAR_COLORS = [
    new Color3(0.82, 0.18, 0.16),
    new Color3(0.16, 0.35, 0.78),
    new Color3(0.9, 0.78, 0.15),
    new Color3(0.92, 0.92, 0.92),
    new Color3(0.2, 0.2, 0.22),
]

const SHIRT_COLORS = [
    new Color3(0.85, 0.3, 0.3),
    new Color3(0.3, 0.5, 0.85),
    new Color3(0.9, 0.75, 0.2),
    new Color3(0.35, 0.7, 0.4),
    new Color3(0.6, 0.35, 0.7),
]

function pick<T>(arr: T[], hash: number): T {
    return arr[Math.floor(hash * arr.length) % arr.length]
}

/**
 * Autonomous, decision-making NPCs (cars on roads, pedestrians around
 * buildings) — each one is a small state machine (move / idle, with random
 * heading changes and pauses) stepped every frame, not a pre-baked
 * animation curve. This is deliberately simple (no pathfinding, no
 * collision between NPCs, no road-lane discipline) — it's meant to make a
 * placed city look alive, not to simulate traffic or crowds.
 */
export class NpcSystem {
    private npcs = new Map<string, Npc>()
    private carMaster: Mesh
    private personMaster: Mesh
    private headMaster: Mesh
    private counter = 0
    private lastTime = performance.now()
    private removeObserver: () => void

    constructor(
        private scene: Scene,
        onMasterMesh?: (mesh: Mesh) => void,
    ) {
        this.carMaster = this.buildCarMaster()
        this.personMaster = this.buildPersonBodyMaster()
        this.headMaster = this.buildPersonHeadMaster()
        onMasterMesh?.(this.carMaster)
        onMasterMesh?.(this.personMaster)
        onMasterMesh?.(this.headMaster)

        const observer = scene.onBeforeRenderObservable.add(() => this.tick())
        this.removeObserver = () => scene.onBeforeRenderObservable.remove(observer)
    }

    private buildCarMaster(): Mesh {
        const mat = new StandardMaterial('citygame-car-mat', this.scene)
        mat.diffuseColor = Color3.White()
        mat.specularColor = Color3.Black()
        const body = MeshBuilder.CreateBox('npc-car', { width: 0.95, height: 0.55, depth: 1.9 }, this.scene)
        body.material = mat
        body.registerInstancedBuffer('color', 4)
        body.instancedBuffers.color = new Color4(1, 1, 1, 1)

        const cabinMat = new StandardMaterial('citygame-car-cabin-mat', this.scene)
        cabinMat.diffuseColor = new Color3(0.15, 0.18, 0.2)
        cabinMat.specularColor = Color3.Black()
        const cabin = MeshBuilder.CreateBox('npc-car-cabin', { width: 0.7, height: 0.35, depth: 0.9 }, this.scene)
        cabin.material = cabinMat
        cabin.position.set(0, 0.45, -0.15)
        cabin.parent = body

        body.isVisible = false
        body.setEnabled(false)
        return body
    }

    private buildPersonBodyMaster(): Mesh {
        const mat = new StandardMaterial('citygame-person-mat', this.scene)
        mat.diffuseColor = Color3.White()
        mat.specularColor = Color3.Black()
        const body = MeshBuilder.CreateCylinder('npc-person', { diameter: 0.35, height: 0.9, tessellation: 8 }, this.scene)
        body.material = mat
        body.registerInstancedBuffer('color', 4)
        body.instancedBuffers.color = new Color4(1, 1, 1, 1)
        body.isVisible = false
        body.setEnabled(false)
        return body
    }

    private buildPersonHeadMaster(): Mesh {
        const mat = new StandardMaterial('citygame-person-head-mat', this.scene)
        mat.diffuseColor = new Color3(0.86, 0.7, 0.58)
        mat.specularColor = Color3.Black()
        const head = MeshBuilder.CreateSphere('npc-person-head', { diameter: 0.28, segments: 8 }, this.scene)
        head.material = mat
        head.isVisible = false
        head.setEnabled(false)
        return head
    }

    private tick() {
        const now = performance.now()
        const dt = Math.min(0.1, (now - this.lastTime) / 1000)
        this.lastTime = now
        for (const npc of this.npcs.values()) this.stepNpc(npc, dt)
    }

    private stepNpc(npc: Npc, dt: number) {
        if (npc.mode === 'idle') {
            npc.timer -= dt
            if (npc.timer <= 0) {
                npc.mode = 'move'
                npc.heading = Math.random() * Math.PI * 2
                npc.timer = 2 + Math.random() * 3
            }
            return
        }

        const pos = npc.node.position
        let nx = pos.x + Math.cos(npc.heading) * npc.speed * dt
        let nz = pos.z + Math.sin(npc.heading) * npc.speed * dt
        let bounced = false

        if (nx < npc.bounds.minX || nx > npc.bounds.maxX) {
            npc.heading = Math.PI - npc.heading
            nx = Math.min(Math.max(nx, npc.bounds.minX), npc.bounds.maxX)
            bounced = true
        }
        if (nz < npc.bounds.minZ || nz > npc.bounds.maxZ) {
            npc.heading = -npc.heading
            nz = Math.min(Math.max(nz, npc.bounds.minZ), npc.bounds.maxZ)
            bounced = true
        }

        pos.x = nx
        pos.z = nz
        npc.node.rotation.y = -npc.heading + Math.PI / 2

        npc.timer -= dt
        if (bounced || npc.timer <= 0) {
            if (Math.random() < 0.25) {
                npc.mode = 'idle'
                npc.timer = 1 + Math.random() * 3
            } else {
                npc.heading += bounced ? (Math.random() - 0.5) * 0.6 : (Math.random() - 0.5) * 2.6
                npc.timer = 2 + Math.random() * 3
            }
        }
    }

    /** Spawns one autonomous car, parented under `parent` (a tile root) so it moves in that tile's local space. */
    spawnCar(id: string, tileId: string, parent: TransformNode, bounds: NpcBounds, hash: number): void {
        if (this.npcs.has(id)) return
        const instance = this.carMaster.createInstance(`npc-car-${this.counter++}`)
        instance.parent = parent
        // Wandering NPCs shouldn't intercept placement/bulldoze picks meant for the ground cell below them.
        instance.isPickable = false
        const color = pick(CAR_COLORS, hash)
        instance.instancedBuffers.color = new Color4(color.r, color.g, color.b, 1)
        this.registerNpc(id, tileId, instance, bounds, 1.2 + hash * 1.3, 0.32)
    }

    /** Spawns one autonomous pedestrian (body + head), parented under `parent`. */
    spawnPedestrian(id: string, tileId: string, parent: TransformNode, bounds: NpcBounds, hash: number): void {
        if (this.npcs.has(id)) return
        const body = this.personMaster.createInstance(`npc-person-${this.counter++}`)
        body.parent = parent
        body.isPickable = false
        const shirt = pick(SHIRT_COLORS, hash)
        body.instancedBuffers.color = new Color4(shirt.r, shirt.g, shirt.b, 1)

        const head = this.headMaster.createInstance(`npc-person-head-${this.counter++}`)
        head.parent = body
        head.isPickable = false
        head.position.set(0, 0.58, 0)

        this.registerNpc(id, tileId, body, bounds, 0.35 + hash * 0.3, 0.45)
    }

    private registerNpc(id: string, tileId: string, node: TransformNode, bounds: NpcBounds, speed: number, height: number) {
        node.position.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX)
        node.position.y = height
        node.position.z = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
        this.npcs.set(id, {
            id,
            tileId,
            node,
            bounds,
            speed,
            height,
            heading: Math.random() * Math.PI * 2,
            mode: 'move',
            timer: 2 + Math.random() * 3,
        })
    }

    updateBounds(id: string, bounds: NpcBounds): void {
        const npc = this.npcs.get(id)
        if (npc) npc.bounds = bounds
    }

    has(id: string): boolean {
        return this.npcs.has(id)
    }

    remove(id: string): void {
        const npc = this.npcs.get(id)
        if (!npc) return
        npc.node.dispose()
        this.npcs.delete(id)
    }

    countForTile(tileId: string, idPrefix: string): number {
        let count = 0
        for (const npc of this.npcs.values()) {
            if (npc.tileId === tileId && npc.id.startsWith(idPrefix)) count++
        }
        return count
    }

    idsForTile(tileId: string, idPrefix: string): string[] {
        const ids: string[] = []
        for (const npc of this.npcs.values()) {
            if (npc.tileId === tileId && npc.id.startsWith(idPrefix)) ids.push(npc.id)
        }
        return ids
    }

    removeAllForTile(tileId: string): void {
        for (const [id, npc] of this.npcs) {
            if (npc.tileId === tileId) {
                npc.node.dispose()
                this.npcs.delete(id)
            }
        }
    }

    dispose(): void {
        this.removeObserver()
        for (const npc of this.npcs.values()) npc.node.dispose()
        this.npcs.clear()
    }
}
