import {
    AbstractEngine,
    ArcRotateCamera,
    Camera,
    Color3,
    Color4,
    DirectionalLight,
    DynamicTexture,
    HemisphericLight,
    Mesh,
    MeshBuilder,
    PointerEventTypes,
    Scene,
    ShadowGenerator,
    StandardMaterial,
    TransformNode,
    Vector3,
} from '@babylonjs/core'
import {
    FACILITY_EFFECTS,
    FURNITURE_BY_ID,
    NEED_DECAY_PER_HOUR,
    NEED_KEYS,
    STARTER_FURNITURE,
    footprint,
    frontVector,
    type FurnitureDef,
    type NeedKey,
    type PlacedFurniture,
    type Rotation,
} from './catalog'
import { FurnitureFactory } from './FurnitureFactory'
import { SimCharacter } from './SimCharacter'

export const ROOM_W = 12
export const ROOM_D = 10
const WALL_H = 2.8

/** In-game minutes that pass per real second at each speed setting (0 = paused). */
const SPEED_FACTOR = [0, 1, 3, 8] as const
export type GameSpeed = 0 | 1 | 2 | 3

export type InteriorMode = 'live' | 'buy' | 'sell'

type LiveNeed = Exclude<NeedKey, 'room'>

const NEED_THOUGHT: Record<LiveNeed, string> = {
    hunger: '배고파...',
    energy: '졸려...',
    comfort: '앉고 싶어',
    fun: '심심해!',
    hygiene: '씻고 싶어',
    bladder: '화장실!',
    social: '누구랑 얘기하고 싶어',
}

export interface NearbyFacilityInfo {
    tool: string
    funded: boolean
    distance: number
}

export interface InteriorFacilityView {
    tool: string
    label: string
    funded: boolean
    distance: number
    description: string
}

export interface InteriorSnapshot {
    needs: Record<NeedKey, number>
    mood: number
    action: string
    clock: { day: number; hour: number; minute: number }
    speed: GameSpeed
    mode: InteriorMode
    selectedItem: string | null
    rotation: Rotation
    furnitureCount: number
    facilities: InteriorFacilityView[]
}

export type ActionResult = { ok: true } | { ok: false; reason: string }

export interface InteriorOptions {
    /** localStorage key for this home's layout/needs/clock — the interior is private, not synced to other players. */
    storageKey: string
    onChange: (snapshot: InteriorSnapshot) => void
    buy: (itemId: string) => Promise<ActionResult>
    sell: (itemId: string) => Promise<ActionResult>
    notify: (text: string) => void
}

interface PlacedEntry {
    data: PlacedFurniture
    node: TransformNode
}

interface UseState {
    uid: string
    def: FurnitureDef
    elapsedMin: number
    /** The need that sent the Sim here (autonomy) — use ends once it's topped up. Null when the player ordered it. */
    triggerNeed: LiveNeed | null
    returnCell: { x: number; z: number }
    arrived: boolean
}

interface SavedState {
    furniture: PlacedFurniture[]
    needs: Record<NeedKey, number>
    clockMinutes: number
}

const cellKey = (x: number, z: number) => `${x}:${z}`

/**
 * The Sims-style half of the game: your own home's interior, rendered in its
 * own Babylon Scene on the same engine as the city (only the active one is
 * rendered and receives input). Cutaway isometric room, buy/sell mode on a
 * 1m grid, and one autonomous Sim whose needs drain over game time and who
 * walks (BFS on the grid) to whatever furniture best fixes the worst one.
 *
 * The city reaches in through `setFacilities`: funded parks/hospitals/etc.
 * near the home slow specific needs' decay and raise the Room score; an
 * unfunded one (its owner's treasury went broke) gives nothing.
 */
export class InteriorScene {
    readonly scene: Scene
    private camera: ArcRotateCamera
    private shadows: ShadowGenerator
    private factory: FurnitureFactory
    private sim: SimCharacter
    private floor!: Mesh
    private gridOverlay!: Mesh

    private placed = new Map<string, PlacedEntry>()
    private occupancy = new Map<string, string>()
    private needs: Record<NeedKey, number> = { hunger: 80, energy: 85, comfort: 70, fun: 60, hygiene: 75, bladder: 70, social: 55, room: 40 }
    private clockMinutes = 8 * 60
    private speed: GameSpeed = 1
    private mode: InteriorMode = 'live'
    private selectedItem: string | null = null
    private rotation: Rotation = 0
    private ghost: TransformNode | null = null
    private ghostPad: Mesh | null = null
    private ghostPadMat!: StandardMaterial
    private ghostCell: { x: number; z: number } | null = null
    private busyBuying = false
    private zoom = 7
    private facilities: NearbyFacilityInfo[] = []

    private simPos = new Vector3(6.5, 0, 3.5)
    private path: { x: number; z: number }[] = []
    private use: UseState | null = null
    private action = '대기 중'
    private decisionCooldown = 0
    private snapshotTimer = 0
    private saveTimer = 0
    private uidCounter = 0
    private active = false

    constructor(
        private engine: AbstractEngine,
        private opts: InteriorOptions,
    ) {
        this.scene = new Scene(engine)
        // Scenes attach pointer input to the shared canvas on construction — the city scene must keep
        // receiving clicks until the player actually walks inside.
        this.scene.detachControl()
        this.scene.clearColor = new Color4(0.78, 0.86, 0.93, 1)

        this.camera = new ArcRotateCamera('interior-cam', -Math.PI / 4, 0.98, 40, new Vector3(6, 0.6, 5), this.scene)
        this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
        this.camera.minZ = 0.1
        this.camera.maxZ = 200
        this.updateOrtho()

        const hemi = new HemisphericLight('interior-hemi', new Vector3(0.2, 1, -0.3), this.scene)
        hemi.intensity = 0.72
        hemi.groundColor = new Color3(0.45, 0.4, 0.38)
        const sun = new DirectionalLight('interior-sun', new Vector3(-0.5, -1, 0.35), this.scene)
        sun.position = new Vector3(18, 20, -8)
        sun.intensity = 0.55
        this.shadows = new ShadowGenerator(2048, sun)
        this.shadows.useBlurExponentialShadowMap = true
        this.shadows.blurKernel = 16
        this.shadows.setDarkness(0.35)

        this.factory = new FurnitureFactory(this.scene)
        this.buildOutdoors()
        this.buildFloor()
        this.buildWalls()
        this.buildGridOverlay()

        this.sim = new SimCharacter(this.scene)
        for (const mesh of this.sim.root.getChildMeshes()) this.shadows.addShadowCaster(mesh)
        this.ghostPadMat = new StandardMaterial('ghost-pad-mat', this.scene)
        this.ghostPadMat.alpha = 0.45
        this.ghostPadMat.disableLighting = true

        this.load()
        this.syncSimTransform()

        this.scene.onPointerObservable.add((info) => {
            if (!this.active) return
            if (info.type === PointerEventTypes.POINTERWHEEL) {
                const delta = (info.event as WheelEvent).deltaY
                this.zoom = Math.min(10, Math.max(3.2, this.zoom + Math.sign(delta) * 0.6))
                this.updateOrtho()
            } else if (info.type === PointerEventTypes.POINTERMOVE) {
                this.onPointerMove()
            } else if (info.type === PointerEventTypes.POINTERDOWN) {
                const button = (info.event as PointerEvent).button
                if (button === 2) this.selectItem(null)
                else if (button === 0) void this.onPointerDown()
            }
        })

        this.scene.onBeforeRenderObservable.add(() => this.tick(engine.getDeltaTime() / 1000))
        engine.onResizeObservable.add(() => this.updateOrtho())
    }

    // ---- public API ----

    activate() {
        this.active = true
        this.scene.attachControl()
        this.updateOrtho()
        this.emitSnapshot()
    }

    deactivate() {
        this.active = false
        this.scene.detachControl()
        this.selectItem(null)
        this.save()
    }

    setMode(mode: InteriorMode) {
        this.mode = mode
        if (mode !== 'buy') this.selectItem(null)
        this.gridOverlay.setEnabled(mode !== 'live')
        this.emitSnapshot()
    }

    selectItem(itemId: string | null) {
        this.selectedItem = itemId && FURNITURE_BY_ID[itemId] ? itemId : null
        this.ghost?.dispose()
        this.ghost = null
        this.ghostPad?.dispose()
        this.ghostPad = null
        this.ghostCell = null
        if (this.selectedItem) {
            if (this.mode !== 'buy') this.setMode('buy')
            this.ghost = this.factory.create(this.selectedItem)
            for (const mesh of this.ghost.getChildMeshes()) {
                mesh.isPickable = false
                mesh.visibility = 0.6
            }
            this.ghost.setEnabled(false)
        }
        this.emitSnapshot()
    }

    rotateSelection() {
        this.rotation = ((this.rotation + 1) % 4) as Rotation
        this.onPointerMove()
        this.emitSnapshot()
    }

    setSpeed(speed: GameSpeed) {
        this.speed = speed
        this.emitSnapshot()
    }

    panCamera(dx: number, dz: number) {
        const t = this.camera.target
        t.x = Math.min(ROOM_W, Math.max(0, t.x + dx))
        t.z = Math.min(ROOM_D, Math.max(0, t.z + dz))
    }

    setFacilities(list: NearbyFacilityInfo[]) {
        this.facilities = list
        this.emitSnapshot()
    }

    /** Direct order from the player (Sims' click-an-object): go use this item now, interrupting whatever the Sim was doing. */
    commandUse(uid: string): boolean {
        const entry = this.placed.get(uid)
        if (!entry) return false
        const def = FURNITURE_BY_ID[entry.data.itemId]
        if (!Object.keys(def.satisfies).length) {
            this.opts.notify(`${def.name}은(는) 장식용이에요`)
            return false
        }
        this.stopUsing()
        return this.goUse(uid, null)
    }

    getSimCell(): { x: number; z: number } {
        return { x: Math.floor(this.simPos.x), z: Math.floor(this.simPos.z) }
    }

    getNeeds(): Record<NeedKey, number> {
        return { ...this.needs }
    }

    getAction(): string {
        return this.action
    }

    listFurniture(): PlacedFurniture[] {
        return [...this.placed.values()].map((e) => ({ ...e.data }))
    }

    /** Places without the purchase round-trip — used for loading saved layouts and by tests. */
    placeDirect(item: Omit<PlacedFurniture, 'uid'>): string | null {
        const def = FURNITURE_BY_ID[item.itemId]
        if (!def || !this.canPlace(def, item.x, item.z, item.rot)) return null
        const uid = `f${Date.now().toString(36)}${this.uidCounter++}`
        const data: PlacedFurniture = { ...item, uid }
        const node = this.factory.create(item.itemId)
        const fp = footprint(def, item.rot)
        node.position.set(item.x + fp.w / 2, 0, item.z + fp.d / 2)
        node.rotation.y = (item.rot * Math.PI) / 2
        for (const mesh of node.getChildMeshes()) {
            mesh.metadata = { furnUid: uid }
            mesh.receiveShadows = true
            this.shadows.addShadowCaster(mesh)
        }
        this.placed.set(uid, { data, node })
        for (const c of this.cellsOf(def, item.x, item.z, item.rot)) this.occupancy.set(cellKey(c.x, c.z), uid)
        return uid
    }

    canPlace(def: FurnitureDef, x: number, z: number, rot: Rotation): boolean {
        const sim = this.getSimCell()
        for (const c of this.cellsOf(def, x, z, rot)) {
            if (c.x < 0 || c.z < 0 || c.x >= ROOM_W || c.z >= ROOM_D) return false
            if (this.occupancy.has(cellKey(c.x, c.z))) return false
            if (!this.use && c.x === sim.x && c.z === sim.z) return false
        }
        return true
    }

    /** Advances the simulation — exposed so headless tests can fast-forward without a render loop. */
    tick(dtSec: number) {
        const dt = Math.min(dtSec, 0.1)
        const dtMin = dt * SPEED_FACTOR[this.speed]
        this.clockMinutes += dtMin
        this.updateNeeds(dtMin)
        this.updateSim(dt, dtMin)

        this.snapshotTimer -= dt
        if (this.snapshotTimer <= 0) {
            this.snapshotTimer = 0.25
            this.emitSnapshot()
        }
        this.saveTimer -= dt
        if (this.saveTimer <= 0) {
            this.saveTimer = 10
            this.save()
        }
    }

    dispose() {
        this.save()
        this.scene.dispose()
    }

    // ---- needs ----

    private decayModifiers(): Record<LiveNeed, number> {
        const mods: Record<LiveNeed, number> = { hunger: 1, energy: 1, comfort: 1, fun: 1, hygiene: 1, bladder: 1, social: 1 }
        const seen = new Set<string>()
        for (const f of this.facilities) {
            if (!f.funded || seen.has(f.tool)) continue
            seen.add(f.tool)
            const effect = FACILITY_EFFECTS[f.tool]
            if (!effect) continue
            for (const [need, factor] of Object.entries(effect.decay)) mods[need as LiveNeed] *= factor as number
        }
        return mods
    }

    /** Room = a base, plus decor in the house (capped), plus the funded city services around it (capped). */
    computeRoomScore(): number {
        let decor = 0
        for (const { data } of this.placed.values()) decor += FURNITURE_BY_ID[data.itemId]?.decor ?? 0
        let city = 0
        const seen = new Set<string>()
        for (const f of this.facilities) {
            if (!f.funded || seen.has(f.tool)) continue
            seen.add(f.tool)
            city += FACILITY_EFFECTS[f.tool]?.room ?? 0
        }
        return Math.max(0, Math.min(100, 25 + Math.min(45, decor * 1.5) + Math.min(30, city)))
    }

    private updateNeeds(dtMin: number) {
        if (dtMin <= 0) return
        const mods = this.decayModifiers()
        for (const key of Object.keys(NEED_DECAY_PER_HOUR) as LiveNeed[]) {
            let value = this.needs[key] - (NEED_DECAY_PER_HOUR[key] / 60) * mods[key] * dtMin
            if (this.use?.arrived) value += (this.use.def.satisfies[key] ?? 0) * dtMin
            this.needs[key] = Math.max(0, Math.min(100, value))
        }
        this.needs.room = this.computeRoomScore()
    }

    private mood(): number {
        let sum = 0
        for (const k of NEED_KEYS) sum += this.needs[k]
        return sum / NEED_KEYS.length / 100
    }

    // ---- Sim behaviour ----

    private updateSim(dt: number, dtMin: number) {
        const moving = this.path.length > 0
        const nowMs = performance.now()

        if (moving) {
            const next = this.path[0]
            const target = new Vector3(next.x + 0.5, 0, next.z + 0.5)
            const delta = target.subtract(this.simPos)
            const dist = delta.length()
            const step = 1.7 * Math.max(1, Math.sqrt(SPEED_FACTOR[this.speed] || 1)) * dt
            if (dist <= step) {
                this.simPos.copyFrom(target)
                this.path.shift()
                if (!this.path.length) this.onArrive()
            } else {
                this.simPos.addInPlace(delta.scale(step / dist))
                this.sim.root.rotation.y = Math.atan2(delta.x, delta.z)
            }
            this.sim.setPose('walk')
        } else if (this.use?.arrived) {
            this.use.elapsedMin += dtMin
            if (this.useFinished()) this.stopUsing()
        } else if (!this.use && this.speed > 0) {
            this.sim.setPose('idle')
            this.decisionCooldown -= dt
            if (this.decisionCooldown <= 0) {
                this.decisionCooldown = 1.2
                this.decide()
            }
        }

        this.syncSimTransform()
        this.sim.setMood(this.mood())
        this.sim.animate(dt, nowMs, this.path.length > 0)
    }

    private syncSimTransform() {
        if (this.use?.arrived && this.use.def.useStyle === 'onto') return
        this.sim.root.position.set(this.simPos.x, 0, this.simPos.z)
    }

    private useFinished(): boolean {
        const use = this.use!
        const maxMinutes = use.def.lie ? 8 * 60 : 90
        if (use.elapsedMin >= maxMinutes) return true
        const keys = Object.keys(use.def.satisfies) as LiveNeed[]
        if (use.triggerNeed) return this.needs[use.triggerNeed] >= 98
        return keys.every((k) => this.needs[k] >= 98) || use.elapsedMin >= 60
    }

    /** Sims autonomy, simplified: fix the most urgent need with the nearest reachable item that satisfies it. */
    private decide() {
        const order = (Object.keys(NEED_DECAY_PER_HOUR) as LiveNeed[]).sort((a, b) => this.needs[a] - this.needs[b])
        for (const need of order) {
            if (this.needs[need] >= 60) break
            const candidates = [...this.placed.values()].filter((e) => (FURNITURE_BY_ID[e.data.itemId].satisfies[need] ?? 0) > 0)
            if (!candidates.length) {
                if (this.needs[need] < 30) this.sim.think(`${NEED_THOUGHT[need]} (가구 필요)`, performance.now())
                continue
            }
            let best: { uid: string; len: number } | null = null
            for (const entry of candidates) {
                const route = this.routeToUse(entry)
                if (route && (!best || route.path.length < best.len)) best = { uid: entry.data.uid, len: route.path.length }
            }
            if (best) {
                if (this.needs[need] < 35) this.sim.think(NEED_THOUGHT[need], performance.now())
                this.goUse(best.uid, need)
                return
            }
        }
        // Content — occasionally wander instead of standing frozen.
        if (Math.random() < 0.25) {
            const x = Math.floor(Math.random() * ROOM_W)
            const z = Math.floor(Math.random() * ROOM_D)
            if (!this.occupancy.has(cellKey(x, z))) {
                const path = this.bfs(this.getSimCell(), [{ x, z }])
                if (path) {
                    this.path = path
                    this.action = '집 안을 둘러보는 중'
                }
            }
        }
    }

    private goUse(uid: string, triggerNeed: LiveNeed | null): boolean {
        const entry = this.placed.get(uid)
        if (!entry) return false
        const route = this.routeToUse(entry)
        if (!route) {
            this.opts.notify('그곳까지 갈 수 없어요')
            return false
        }
        const def = FURNITURE_BY_ID[entry.data.itemId]
        this.use = { uid, def, elapsedMin: 0, triggerNeed, returnCell: route.cell, arrived: false }
        this.path = route.path
        this.action = `${def.name}(으)로 가는 중`
        if (!this.path.length) this.onArrive()
        return true
    }

    commandWalk(x: number, z: number) {
        if (this.occupancy.has(cellKey(x, z))) return
        this.stopUsing()
        const path = this.bfs(this.getSimCell(), [{ x, z }])
        if (path) {
            this.path = path
            this.action = '걷는 중'
        }
    }

    private onArrive() {
        const use = this.use
        if (!use) {
            this.action = '대기 중'
            return
        }
        const entry = this.placed.get(use.uid)
        if (!entry) {
            this.use = null
            return
        }
        use.arrived = true
        this.action = use.def.verb || '사용 중'
        const fp = footprint(use.def, entry.data.rot)
        const center = new Vector3(entry.data.x + fp.w / 2, 0, entry.data.z + fp.d / 2)
        if (use.def.useStyle === 'onto') {
            const facing = (entry.data.rot * Math.PI) / 2
            this.sim.root.rotation.y = facing
            const pose = use.def.lie ? 'lie' : (use.def.seatHeight ?? 0) > 0.2 ? 'sit' : 'use'
            this.sim.setPose(pose)
            const y = use.def.lie ? use.def.seatHeight ?? 0.5 : Math.max(0, (use.def.seatHeight ?? 0) - 0.42)
            this.sim.root.position.set(center.x, y, center.z)
        } else {
            const d = center.subtract(this.simPos)
            this.sim.root.rotation.y = Math.atan2(d.x, d.z)
            this.sim.setPose('use')
        }
    }

    private stopUsing() {
        if (this.use?.arrived && this.use.def.useStyle === 'onto') {
            this.simPos.set(this.use.returnCell.x + 0.5, 0, this.use.returnCell.z + 0.5)
        }
        this.use = null
        this.path = []
        this.sim.setPose('idle')
        this.action = '대기 중'
        this.syncSimTransform()
    }

    /** Free cells directly in front of an item, and the shortest walk to any of them. */
    private routeToUse(entry: PlacedEntry): { cell: { x: number; z: number }; path: { x: number; z: number }[] } | null {
        const def = FURNITURE_BY_ID[entry.data.itemId]
        const own = new Set(this.cellsOf(def, entry.data.x, entry.data.z, entry.data.rot).map((c) => cellKey(c.x, c.z)))
        const f = frontVector(entry.data.rot)
        const goals: { x: number; z: number }[] = []
        for (const c of this.cellsOf(def, entry.data.x, entry.data.z, entry.data.rot)) {
            const g = { x: c.x + f.dx, z: c.z + f.dz }
            if (own.has(cellKey(g.x, g.z))) continue
            if (g.x < 0 || g.z < 0 || g.x >= ROOM_W || g.z >= ROOM_D) continue
            if (this.occupancy.has(cellKey(g.x, g.z))) continue
            goals.push(g)
        }
        if (!goals.length) return null
        const path = this.bfs(this.getSimCell(), goals)
        if (!path) return null
        const end = path.length ? path[path.length - 1] : this.getSimCell()
        return { cell: end, path }
    }

    /** 4-neighbour BFS over free grid cells. Returns the cells to walk (start excluded), or null if unreachable. */
    private bfs(start: { x: number; z: number }, goals: { x: number; z: number }[]): { x: number; z: number }[] | null {
        const goalSet = new Set(goals.map((g) => cellKey(g.x, g.z)))
        if (goalSet.has(cellKey(start.x, start.z))) return []
        const prev = new Map<string, string | null>([[cellKey(start.x, start.z), null]])
        const queue: { x: number; z: number }[] = [start]
        while (queue.length) {
            const cur = queue.shift()!
            for (const [dx, dz] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                const nx = cur.x + dx
                const nz = cur.z + dz
                const key = cellKey(nx, nz)
                if (nx < 0 || nz < 0 || nx >= ROOM_W || nz >= ROOM_D || prev.has(key) || this.occupancy.has(key)) continue
                prev.set(key, cellKey(cur.x, cur.z))
                if (goalSet.has(key)) {
                    const path: { x: number; z: number }[] = []
                    let k: string | null = key
                    while (k && k !== cellKey(start.x, start.z)) {
                        const [px, pz] = k.split(':').map(Number)
                        path.unshift({ x: px, z: pz })
                        k = prev.get(k) ?? null
                    }
                    return path
                }
                queue.push({ x: nx, z: nz })
            }
        }
        return null
    }

    private cellsOf(def: FurnitureDef, x: number, z: number, rot: Rotation): { x: number; z: number }[] {
        const fp = footprint(def, rot)
        const cells: { x: number; z: number }[] = []
        for (let i = 0; i < fp.w; i++) for (let j = 0; j < fp.d; j++) cells.push({ x: x + i, z: z + j })
        return cells
    }

    // ---- input ----

    private pickFloorCell(): { x: number; z: number } | null {
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => m === this.floor)
        if (!pick?.hit || !pick.pickedPoint) return null
        const x = Math.floor(pick.pickedPoint.x)
        const z = Math.floor(pick.pickedPoint.z)
        if (x < 0 || z < 0 || x >= ROOM_W || z >= ROOM_D) return null
        return { x, z }
    }

    private pickFurnitureUid(): string | null {
        const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (m) => !!m.metadata?.furnUid)
        return (pick?.hit && (pick.pickedMesh?.metadata?.furnUid as string)) || null
    }

    private onPointerMove() {
        if (!this.ghost || !this.selectedItem) return
        const cell = this.pickFloorCell()
        if (!cell) {
            this.ghost.setEnabled(false)
            this.ghostPad?.setEnabled(false)
            this.ghostCell = null
            return
        }
        const def = FURNITURE_BY_ID[this.selectedItem]
        const fp = footprint(def, this.rotation)
        const x = cell.x - Math.floor((fp.w - 1) / 2)
        const z = cell.z - Math.floor((fp.d - 1) / 2)
        this.ghostCell = { x, z }
        this.ghost.setEnabled(true)
        this.ghost.position.set(x + fp.w / 2, 0, z + fp.d / 2)
        this.ghost.rotation.y = (this.rotation * Math.PI) / 2

        this.ghostPad?.dispose()
        this.ghostPad = MeshBuilder.CreateGround('ghost-pad', { width: fp.w, height: fp.d }, this.scene)
        this.ghostPad.isPickable = false
        this.ghostPad.material = this.ghostPadMat
        this.ghostPad.position.set(x + fp.w / 2, 0.02, z + fp.d / 2)
        const ok = this.canPlace(def, x, z, this.rotation)
        this.ghostPadMat.emissiveColor = ok ? new Color3(0.25, 0.85, 0.35) : new Color3(0.95, 0.25, 0.25)
    }

    private async onPointerDown() {
        if (this.mode === 'buy' && this.selectedItem) {
            this.onPointerMove()
            if (!this.ghostCell || this.busyBuying) return
            const def = FURNITURE_BY_ID[this.selectedItem]
            const { x, z } = this.ghostCell
            if (!this.canPlace(def, x, z, this.rotation)) {
                this.opts.notify('여기에는 놓을 수 없어요')
                return
            }
            this.busyBuying = true
            const result = await this.opts.buy(def.id)
            this.busyBuying = false
            if (!result.ok) {
                this.opts.notify(result.reason === 'insufficient-funds' ? '가계 자금이 부족해요' : `구매 실패 (${result.reason})`)
                return
            }
            // Re-check: the Sim may have walked onto the spot during the round-trip.
            if (this.placeDirect({ itemId: def.id, x, z, rot: this.rotation })) {
                this.opts.notify(`${def.name} 구매 −§${def.price.toLocaleString()}`)
                this.save()
            }
            return
        }

        const uid = this.pickFurnitureUid()
        if (this.mode === 'sell') {
            if (uid) await this.sellFurniture(uid)
            return
        }
        if (uid) {
            this.commandUse(uid)
            return
        }
        const cell = this.pickFloorCell()
        if (cell) this.commandWalk(cell.x, cell.z)
    }

    private async sellFurniture(uid: string) {
        const entry = this.placed.get(uid)
        if (!entry) return
        const def = FURNITURE_BY_ID[entry.data.itemId]
        if (this.use?.uid === uid) this.stopUsing()
        if (!entry.data.starter) {
            const result = await this.opts.sell(def.id)
            if (!result.ok) {
                this.opts.notify(`판매 실패 (${result.reason})`)
                return
            }
            this.opts.notify(`${def.name} 판매 +§${Math.floor(def.price / 2).toLocaleString()}`)
        } else {
            this.opts.notify(`${def.name} 치움 (기본 가구는 환불 없음)`)
        }
        for (const [key, owner] of this.occupancy) if (owner === uid) this.occupancy.delete(key)
        entry.node.dispose()
        this.placed.delete(uid)
        this.save()
    }

    // ---- camera / snapshot / persistence ----

    private updateOrtho() {
        const aspect = this.engine.getRenderWidth() / Math.max(1, this.engine.getRenderHeight())
        this.camera.orthoTop = this.zoom
        this.camera.orthoBottom = -this.zoom
        this.camera.orthoLeft = -this.zoom * aspect
        this.camera.orthoRight = this.zoom * aspect
    }

    private emitSnapshot() {
        const total = Math.floor(this.clockMinutes)
        const facilities: InteriorFacilityView[] = this.facilities.map((f) => ({
            tool: f.tool,
            label: FACILITY_EFFECTS[f.tool]?.label ?? f.tool,
            funded: f.funded,
            distance: Math.round(f.distance),
            description: FACILITY_EFFECTS[f.tool]?.description ?? '',
        }))
        this.opts.onChange({
            needs: { ...this.needs },
            mood: this.mood(),
            action: this.action,
            clock: { day: Math.floor(total / 1440) + 1, hour: Math.floor((total % 1440) / 60), minute: total % 60 },
            speed: this.speed,
            mode: this.mode,
            selectedItem: this.selectedItem,
            rotation: this.rotation,
            furnitureCount: this.placed.size,
            facilities,
        })
    }

    private load() {
        let saved: SavedState | null = null
        try {
            const raw = localStorage.getItem(this.opts.storageKey)
            saved = raw ? (JSON.parse(raw) as SavedState) : null
        } catch {
            saved = null
        }
        const items = saved?.furniture?.length ? saved.furniture : STARTER_FURNITURE
        for (const item of items) this.placeDirect({ itemId: item.itemId, x: item.x, z: item.z, rot: item.rot, starter: item.starter })
        if (saved?.needs) this.needs = { ...this.needs, ...saved.needs }
        if (typeof saved?.clockMinutes === 'number') this.clockMinutes = saved.clockMinutes
    }

    save() {
        const state: SavedState = { furniture: this.listFurniture(), needs: this.needs, clockMinutes: this.clockMinutes }
        try {
            localStorage.setItem(this.opts.storageKey, JSON.stringify(state))
        } catch {
            // Storage unavailable (private mode / quota) — the home just won't persist across reloads.
        }
    }

    // ---- room construction ----

    private buildFloor() {
        const px = 100
        const tex = new DynamicTexture('interior-floor-tex', { width: ROOM_W * px, height: ROOM_D * px }, this.scene, true)
        const ctx = tex.getContext() as CanvasRenderingContext2D
        // DynamicTexture's default invertY maps canvas row 0 onto the ground's z=0 (near) edge.
        const rect = (x0: number, z0: number, x1: number, z1: number) => [x0 * px, z0 * px, (x1 - x0) * px, (z1 - z0) * px] as const

        // Living room: deep maroon carpet with a subtle weave.
        ctx.fillStyle = '#7a2334'
        ctx.fillRect(0, 0, ROOM_W * px, ROOM_D * px)
        ctx.fillStyle = 'rgba(0,0,0,0.06)'
        for (let i = 0; i < ROOM_W * px; i += 6) ctx.fillRect(i, 0, 2, ROOM_D * px)

        // Kitchen/dining: terracotta parquet with a diamond inlay (the classic Sims kitchen floor).
        const [kx, ky, kw, kh] = rect(0, 5, 6, 10)
        ctx.fillStyle = '#b8743f'
        ctx.fillRect(kx, ky, kw, kh)
        ctx.fillStyle = '#8f5226'
        for (let cx = 0; cx < 6; cx++) {
            for (let cz = 5; cz < 10; cz++) {
                const [x, y] = rect(cx, cz, cx + 1, cz + 1)
                ctx.beginPath()
                ctx.moveTo(x + px / 2, y + 8)
                ctx.lineTo(x + px - 8, y + px / 2)
                ctx.lineTo(x + px / 2, y + px - 8)
                ctx.lineTo(x + 8, y + px / 2)
                ctx.closePath()
                ctx.fill()
            }
        }
        ctx.strokeStyle = 'rgba(60,30,10,0.35)'
        ctx.lineWidth = 2
        for (let cx = 0; cx <= 6; cx++) {
            ctx.beginPath()
            ctx.moveTo(cx * px, ky)
            ctx.lineTo(cx * px, ky + kh)
            ctx.stroke()
        }

        // Bathroom: small white/blue ceramic tiles.
        const [bx, by, bw, bh] = rect(0, 0, 3, 4)
        for (let i = 0; i < bw; i += 25) {
            for (let j = 0; j < bh; j += 25) {
                ctx.fillStyle = (i / 25 + j / 25) % 2 === 0 ? '#e8f1f7' : '#b9d4e8'
                ctx.fillRect(bx + i, by + j, 24, 24)
            }
        }
        tex.update(false)

        this.floor = MeshBuilder.CreateGround('interior-floor', { width: ROOM_W, height: ROOM_D }, this.scene)
        this.floor.position.set(ROOM_W / 2, 0, ROOM_D / 2)
        const mat = new StandardMaterial('interior-floor-mat', this.scene)
        mat.diffuseTexture = tex
        mat.specularColor = new Color3(0.05, 0.05, 0.05)
        this.floor.material = mat
        this.floor.receiveShadows = true
    }

    private wallpaperMat(): StandardMaterial {
        const tex = new DynamicTexture('interior-wall-tex', { width: 256, height: 256 }, this.scene, true)
        const ctx = tex.getContext() as CanvasRenderingContext2D
        ctx.fillStyle = '#3f8c83'
        ctx.fillRect(0, 0, 256, 256)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 10, 256)
        ctx.fillStyle = '#f2efe6'
        ctx.fillRect(0, 0, 256, 12)
        ctx.fillStyle = '#5a3a24'
        ctx.fillRect(0, 196, 256, 60)
        ctx.fillStyle = '#6f4a2f'
        ctx.fillRect(0, 196, 256, 6)
        tex.update(false)
        tex.uScale = 4
        const mat = new StandardMaterial('interior-wall-mat', this.scene)
        mat.diffuseTexture = tex
        mat.specularColor = Color3.Black()
        return mat
    }

    private buildWalls() {
        const wallMat = this.wallpaperMat()
        const trim = new StandardMaterial('interior-trim', this.scene)
        trim.diffuseColor = new Color3(0.95, 0.94, 0.9)
        trim.specularColor = Color3.Black()
        const glass = new StandardMaterial('interior-glass', this.scene)
        glass.diffuseColor = new Color3(0.65, 0.85, 0.98)
        glass.emissiveColor = new Color3(0.35, 0.5, 0.6)
        glass.specularColor = new Color3(0.6, 0.6, 0.6)

        const west = MeshBuilder.CreateBox('wall-west', { width: 0.2, height: WALL_H, depth: ROOM_D + 0.2 }, this.scene)
        west.position.set(-0.1, WALL_H / 2, ROOM_D / 2)
        west.material = wallMat
        const north = MeshBuilder.CreateBox('wall-north', { width: ROOM_W + 0.4, height: WALL_H, depth: 0.2 }, this.scene)
        north.position.set(ROOM_W / 2, WALL_H / 2, ROOM_D + 0.1)
        north.material = wallMat
        for (const w of [west, north]) {
            w.receiveShadows = true
            w.isPickable = false
        }

        const windowAt = (x: number, z: number, onWest: boolean) => {
            const frame = MeshBuilder.CreateBox('window-frame', { width: onWest ? 0.06 : 1.3, height: 1.5, depth: onWest ? 1.3 : 0.06 }, this.scene)
            frame.material = trim
            frame.position.set(x, 1.55, z)
            const pane = MeshBuilder.CreateBox('window-pane', { width: onWest ? 0.07 : 1.1, height: 1.3, depth: onWest ? 1.1 : 0.07 }, this.scene)
            pane.material = glass
            pane.position.set(x + (onWest ? 0.005 : 0), 1.55, z - (onWest ? 0 : 0.005))
            const bar = MeshBuilder.CreateBox('window-bar', { width: onWest ? 0.08 : 0.05, height: 1.3, depth: onWest ? 0.05 : 0.08 }, this.scene)
            bar.material = trim
            bar.position.set(x, 1.55, z)
            for (const m of [frame, pane, bar]) m.isPickable = false
        }
        windowAt(3, ROOM_D - 0.02, false)
        windowAt(8.5, ROOM_D - 0.02, false)
        windowAt(0.02, 6.5, true)

        // Cutaway front walls (Sims "walls down"): low stubs that outline the room without blocking the view.
        const stubMat = new StandardMaterial('interior-stub', this.scene)
        stubMat.diffuseColor = new Color3(0.93, 0.9, 0.84)
        stubMat.specularColor = Color3.Black()
        const stub = (name: string, w: number, d: number, x: number, z: number) => {
            const m = MeshBuilder.CreateBox(name, { width: w, height: 0.35, depth: d }, this.scene)
            m.position.set(x, 0.175, z)
            m.material = stubMat
            m.isPickable = false
        }
        stub('wall-east', 0.2, ROOM_D + 0.2, ROOM_W + 0.1, ROOM_D / 2)
        stub('wall-south-a', 8, 0.2, 4, -0.1)
        stub('wall-south-b', 2.2, 0.2, 11.1, -0.1)
    }

    private buildGridOverlay() {
        const px = 64
        const tex = new DynamicTexture('interior-grid-tex', { width: ROOM_W * px, height: ROOM_D * px }, this.scene, true)
        tex.hasAlpha = true
        const ctx = tex.getContext() as CanvasRenderingContext2D
        ctx.clearRect(0, 0, ROOM_W * px, ROOM_D * px)
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 2
        for (let x = 0; x <= ROOM_W; x++) {
            ctx.beginPath()
            ctx.moveTo(x * px, 0)
            ctx.lineTo(x * px, ROOM_D * px)
            ctx.stroke()
        }
        for (let z = 0; z <= ROOM_D; z++) {
            ctx.beginPath()
            ctx.moveTo(0, z * px)
            ctx.lineTo(ROOM_W * px, z * px)
            ctx.stroke()
        }
        tex.update(false)
        this.gridOverlay = MeshBuilder.CreateGround('interior-grid', { width: ROOM_W, height: ROOM_D }, this.scene)
        this.gridOverlay.position.set(ROOM_W / 2, 0.01, ROOM_D / 2)
        const mat = new StandardMaterial('interior-grid-mat', this.scene)
        mat.diffuseTexture = tex
        mat.useAlphaFromDiffuseTexture = true
        mat.disableLighting = true
        mat.emissiveColor = new Color3(1, 1, 1)
        this.gridOverlay.material = mat
        this.gridOverlay.isPickable = false
        this.gridOverlay.setEnabled(false)
    }

    private buildOutdoors() {
        const grass = MeshBuilder.CreateGround('interior-lawn', { width: 60, height: 60 }, this.scene)
        grass.position.set(ROOM_W / 2, -0.02, ROOM_D / 2)
        const grassMat = new StandardMaterial('interior-lawn-mat', this.scene)
        grassMat.diffuseColor = new Color3(0.42, 0.66, 0.34)
        grassMat.specularColor = Color3.Black()
        grass.material = grassMat
        grass.isPickable = false
        grass.receiveShadows = true

        const pathMat = new StandardMaterial('interior-path-mat', this.scene)
        pathMat.diffuseColor = new Color3(0.8, 0.77, 0.7)
        pathMat.specularColor = Color3.Black()
        const path = MeshBuilder.CreateGround('interior-walk', { width: 2, height: 6 }, this.scene)
        path.position.set(9, -0.01, -3)
        path.material = pathMat
        path.isPickable = false

        const bushMat = new StandardMaterial('interior-bush-mat', this.scene)
        bushMat.diffuseColor = new Color3(0.26, 0.5, 0.26)
        bushMat.specularColor = Color3.Black()
        for (const [x, z] of [
            [1, -0.9],
            [3, -0.9],
            [5, -0.9],
            [12.9, 2],
            [12.9, 5],
            [12.9, 8],
        ]) {
            const bush = MeshBuilder.CreateSphere('interior-bush', { diameter: 0.9, segments: 8 }, this.scene)
            bush.position.set(x, 0.3, z)
            bush.scaling.y = 0.7
            bush.material = bushMat
            bush.isPickable = false
        }
    }
}
