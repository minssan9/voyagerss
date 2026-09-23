import { Animation, Color3, Color4, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import type { BuildingLevel, PlaceableTool } from '../../types'

/** Every master mesh below is authored against this footprint (meters); `spawn()` rescales per-tile. */
const CANONICAL_CELL = 8

/** Roads aren't in the variant system — their look is driven by which neighbors are also roads, not a per-cell hash. */
type BuildableTool = Exclude<PlaceableTool, 'road'>
type MasterKey = `${BuildableTool}:${BuildingLevel}`

export type RoadDirection = 'N' | 'E' | 'S' | 'W'
const ROAD_ARM_ROTATION: Record<RoadDirection, number> = { S: 0, N: 0, E: Math.PI / 2, W: Math.PI / 2 }
const ROAD_ARM_OFFSET: Record<RoadDirection, Vector3> = {
    S: new Vector3(0, 0, CANONICAL_CELL / 4),
    N: new Vector3(0, 0, -CANONICAL_CELL / 4),
    E: new Vector3(CANONICAL_CELL / 4, 0, 0),
    W: new Vector3(-CANONICAL_CELL / 4, 0, 0),
}

interface PartTemplate {
    mesh: Mesh
    position: Vector3
    rotationY: number
    /** Gets a small per-instance brightness jitter via Babylon's instanced-color buffer, so identical models don't look cloned. */
    tintable?: boolean
}

/**
 * Deterministic per-cell hash in [0, 1) — same tile+cell always picks the
 * same variant/tint, with no need to sync a "variant" field over the
 * network. Mixes cellX/cellY as integers (murmur-style finalizer constants)
 * rather than hashing their concatenated string form, so adjacent cells
 * (which differ by 1 in a single coordinate) don't end up with correlated
 * hashes — a plain string hash tends to do that for short numeric suffixes.
 */
function cellHash(tileId: string, cellX: number, cellY: number): number {
    let h = 0
    for (let i = 0; i < tileId.length; i++) h = (Math.imul(h, 31) + tileId.charCodeAt(i)) >>> 0
    h = Math.imul(h ^ Math.imul(cellX, 0x9e3779b1), 0x85ebca6b) >>> 0
    h = Math.imul(h ^ Math.imul(cellY, 0xc2b2ae35), 0x27d4eb2f) >>> 0
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
}

function clamp01(v: number): number {
    return Math.min(1, Math.max(0, v))
}

/**
 * Procedural, low-poly "SimCity-lite" building models. Real 3D assets would
 * need an art pipeline this project doesn't have; primitives (box/cylinder)
 * composed per zone type and growth level get a similar silhouette variety
 * for a fraction of the effort.
 *
 * Every part is built once as a hidden master mesh, then handed out via
 * `mesh.createInstance()` — instances share one GPU vertex buffer, so a
 * city with a thousand houses still costs one draw call per house *part*,
 * not per house. Variety comes from two cheap tricks on top of that: (1)
 * each (tool, level) can register more than one geometry variant, picked
 * deterministically per grid cell, and (2) "tintable" parts get a per-
 * instance brightness jitter via `instancedBuffers.color`, so even the same
 * variant doesn't look perfectly cloned next door.
 */
export class ProceduralBuildingFactory {
    private masters = new Map<MasterKey, PartTemplate[][]>()
    private beaconMat: StandardMaterial
    private counter = 0

    // Road parts are handled outside the variant system — see spawnRoad().
    private roadSurfaceMaster!: Mesh
    private roadCurbMaster!: Mesh
    private roadArmMaster!: Mesh
    private roadCrosswalkBarMaster!: Mesh
    private unfundedMarkerMaster!: Mesh

    constructor(
        private scene: Scene,
        private onMasterMesh?: (mesh: Mesh) => void,
    ) {
        this.beaconMat = this.mat('beacon-red', new Color3(0.95, 0.15, 0.15), true)

        this.registerVariants('zone-residential:1', [this.buildHouseA(), this.buildHouseB()])
        this.registerVariants('zone-residential:2', [this.buildDuplex()])
        this.registerVariants('zone-residential:3', [this.buildApartment()])
        this.registerVariants('zone-commercial:1', [this.buildShopA(), this.buildShopB()])
        this.registerVariants('zone-commercial:2', [this.buildOfficeLow()])
        this.registerVariants('zone-commercial:3', [this.buildSkyscraper()])
        this.registerVariants('zone-industrial:1', [this.buildWarehouseA(), this.buildWarehouseB()])
        this.registerVariants('zone-industrial:2', [this.buildFactory()])
        this.registerVariants('zone-industrial:3', [this.buildIndustrialComplex()])
        this.registerVariants('home:1', [this.buildHome()])
        this.registerVariants('facility-park:1', [this.buildPark()])
        this.registerVariants('facility-hospital:1', [this.buildHospital()])
        this.registerVariants('facility-police:1', [this.buildPolice()])
        this.registerVariants('facility-school:1', [this.buildSchool()])
        this.registerVariants('facility-landmark:1', [this.buildLandmark()])
        this.buildRoadMasters()
        this.buildUnfundedMarkerMaster()

        this.startBeaconBlink()
    }

    /** All rooftop beacons share one material, so one animation blinks every skyscraper/factory stack in sync. */
    private startBeaconBlink() {
        const beacon = this.beaconMat
        const fps = 30
        const blink = new Animation('beaconBlink', 'emissiveColor', fps, Animation.ANIMATIONTYPE_COLOR3, Animation.ANIMATIONLOOPMODE_CYCLE)
        const bright = new Color3(0.95, 0.15, 0.15)
        const dim = new Color3(0.25, 0.03, 0.03)
        blink.setKeys([
            { frame: 0, value: bright },
            { frame: fps * 0.4, value: bright },
            { frame: fps * 0.6, value: dim },
            { frame: fps * 1.4, value: dim },
            { frame: fps * 1.6, value: bright },
        ])
        this.scene.beginDirectAnimation(beacon, [blink], 0, fps * 1.6, true)
    }

    /** Spawns a positioned instance group for one building (not roads — see spawnRoad); caller owns disposing the returned node. */
    spawn(tool: BuildableTool, level: BuildingLevel, footprintMeters: number, tileId: string, cellX: number, cellY: number): TransformNode {
        const key = this.resolveKey(tool, level)
        const variants = this.masters.get(key) ?? []
        const hash = cellHash(tileId, cellX, cellY)
        const variant = variants.length ? variants[Math.floor(hash * variants.length) % variants.length] : []

        const group = new TransformNode(`bld-${key}-${this.counter++}`, this.scene)
        const scale = footprintMeters / CANONICAL_CELL
        group.scaling.set(scale, 1, scale)

        // A second hash draw (offset so it doesn't just mirror the variant pick) drives the tint jitter.
        const tintHash = cellHash(tileId, cellX + 7919, cellY + 104729)
        const brightness = 0.82 + tintHash * 0.36

        for (const template of variant) {
            const instance = template.mesh.createInstance(`${group.name}-part${this.counter++}`)
            instance.parent = group
            // InstancedMesh defaults isPickable=true regardless of the master — without this, a pointer
            // ray over a built cell hits the building geometry instead of the tile plate beneath it, and
            // pickCell() (which reads tileId off the plate's metadata) silently returns null there.
            instance.isPickable = false
            instance.position.copyFrom(template.position)
            instance.rotation.y = template.rotationY
            if (template.tintable) {
                const base = (template.mesh.material as StandardMaterial).diffuseColor
                instance.instancedBuffers.color = new Color4(
                    clamp01(base.r * brightness),
                    clamp01(base.g * brightness),
                    clamp01(base.b * brightness),
                    1,
                )
            }
        }

        return group
    }

    private resolveKey(tool: BuildableTool, level: BuildingLevel): MasterKey {
        const key = `${tool}:${level}` as MasterKey
        if (this.masters.has(key)) return key
        return `${tool}:1` as MasterKey
    }

    /**
     * Spawns a road cell shaped by which of its 4 neighbors are also roads
     * (auto-tiling, like any real city builder) — a straight segment, a
     * corner, a T, a 4-way crossing with a crosswalk, or a bare pad if it's
     * isolated. `arms` uses compass-style keys purely as identifiers (no
     * real-world orientation implied).
     */
    spawnRoad(footprintMeters: number, arms: ReadonlySet<RoadDirection>): TransformNode {
        const group = new TransformNode(`road-${this.counter++}`, this.scene)
        const scale = footprintMeters / CANONICAL_CELL
        group.scaling.set(scale, 1, scale)

        // Non-pickable for the same reason as building parts (see spawn()): pointer rays over a road
        // cell should resolve to the tile plate beneath, not this geometry.
        const surface = this.roadSurfaceMaster.createInstance(`${group.name}-surface`)
        surface.parent = group
        surface.isPickable = false
        surface.position.y = 0.075

        for (const dir of ['N', 'E', 'S', 'W'] as RoadDirection[]) {
            const curb = this.roadCurbMaster.createInstance(`${group.name}-curb-${dir}`)
            curb.parent = group
            curb.isPickable = false
            const edgePos = ROAD_ARM_OFFSET[dir].scale(2)
            curb.position.set(edgePos.x, 0.1, edgePos.z)
            curb.rotation.y = ROAD_ARM_ROTATION[dir]
            curb.isVisible = !arms.has(dir)
        }

        if (arms.size === 4) {
            for (let i = 0; i < 5; i++) {
                const bar = this.roadCrosswalkBarMaster.createInstance(`${group.name}-crosswalk-${i}`)
                bar.parent = group
                bar.isPickable = false
                bar.position.set(-2 + i, 0.16, 0)
                bar.rotation.x = Math.PI / 2
            }
        } else {
            for (const dir of arms) {
                const arm = this.roadArmMaster.createInstance(`${group.name}-arm-${dir}`)
                arm.parent = group
                arm.isPickable = false
                const offset = ROAD_ARM_OFFSET[dir]
                arm.position.set(offset.x, 0.16, offset.z)
                arm.rotation.y = ROAD_ARM_ROTATION[dir]
            }
        }

        return group
    }

    /**
     * Road parts, authored once: an asphalt pad, a curb strip per edge
     * (shown only where that edge isn't connected to a neighboring road, so
     * connected cells flow into each other without a seam), a radial lane
     * "arm" reused per connected direction, and a crosswalk bar for 4-way
     * crossings. Curb boxes are authored long-axis-along-X so the same
     * ROAD_ARM_ROTATION values line up N/S edges at 0° and E/W at 90°.
     */
    private buildRoadMasters() {
        const roadMat = this.mat('road-surface', new Color3(0.24, 0.25, 0.27))
        const curbMat = this.mat('road-curb', new Color3(0.72, 0.71, 0.68))
        const armMat = this.mat('road-arm', new Color3(0.9, 0.78, 0.24), true)
        const crosswalkMat = this.mat('road-crosswalk', new Color3(0.88, 0.88, 0.85), true)

        // Positions are set per-instance in spawnRoad() — InstancedMesh does not inherit the source mesh's transform.
        this.roadSurfaceMaster = this.box('road-surface', CANONICAL_CELL, 0.15, CANONICAL_CELL, roadMat)
        this.roadCurbMaster = this.box('road-curb', CANONICAL_CELL, 0.12, 0.18, curbMat)
        this.roadArmMaster = this.box('road-arm', 0.3, 0.02, CANONICAL_CELL / 2, armMat)

        this.roadCrosswalkBarMaster = MeshBuilder.CreatePlane('road-crosswalk-bar', { width: 0.5, height: 1.6 }, this.scene)
        this.roadCrosswalkBarMaster.material = crosswalkMat
        this.roadCrosswalkBarMaster.rotation.x = Math.PI / 2

        for (const mesh of [this.roadSurfaceMaster, this.roadCurbMaster, this.roadArmMaster, this.roadCrosswalkBarMaster]) {
            this.hide(mesh)
            this.onMasterMesh?.(mesh)
        }
    }

    private registerVariants(key: MasterKey, variants: PartTemplate[][]) {
        for (const templates of variants) {
            for (const t of templates) {
                this.hide(t.mesh)
                this.onMasterMesh?.(t.mesh)
            }
        }
        this.masters.set(key, variants)
    }

    private hide(mesh: Mesh) {
        mesh.isVisible = false
        mesh.setEnabled(false)
    }

    // ---- material cache ----
    private materials = new Map<string, StandardMaterial>()
    private mat(name: string, color: Color3, emissive = false): StandardMaterial {
        const key = `${name}:${color.toHexString()}:${emissive}`
        const cached = this.materials.get(key)
        if (cached) return cached
        const mat = new StandardMaterial(`citygame-${name}-${this.materials.size}`, this.scene)
        mat.diffuseColor = color
        mat.specularColor = Color3.Black()
        if (emissive) mat.emissiveColor = color
        this.materials.set(key, mat)
        return mat
    }

    // ---- primitive helpers (authored in meters against CANONICAL_CELL) ----
    private box(name: string, w: number, h: number, d: number, mat: StandardMaterial, wrap = false): Mesh {
        const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d, wrap }, this.scene)
        mesh.material = mat
        return mesh
    }

    /** Like `box`, but registers the instanced-color buffer so `spawn()` can jitter this part's brightness per instance. */
    private tintBox(name: string, w: number, h: number, d: number, mat: StandardMaterial, wrap = false): Mesh {
        const mesh = this.box(name, w, h, d, mat, wrap)
        mesh.registerInstancedBuffer('color', 4)
        mesh.instancedBuffers.color = new Color4(1, 1, 1, 1)
        return mesh
    }

    // ---- baked window-grid wall textures ----
    private wallTextures = new Map<string, StandardMaterial>()

    /**
     * Bakes a window grid (plus a darker foundation band, and optionally a ground-floor doorway) into a
     * texture, instead of gluing a single flat "window strip" decal onto the front face only. Paired with
     * `box(..., wrap: true)` this tiles identically across all 4 side faces, so a facade reads as a real
     * multi-floor building from every angle, not just the one side a decal happened to be glued to.
     * Cached by key since many instances (and even several building variants) reuse the same baked look.
     */
    private windowWallMat(key: string, wallColor: Color3, windowColor: Color3, cols: number, rows: number, groundDoor = false): StandardMaterial {
        const cached = this.wallTextures.get(key)
        if (cached) return cached

        const size = 256
        const texture = new DynamicTexture(`wall-tex-${key}`, size, this.scene, true)
        const ctx = texture.getContext() as CanvasRenderingContext2D
        ctx.fillStyle = wallColor.toHexString()
        ctx.fillRect(0, 0, size, size)

        const cellW = size / cols
        const cellH = size / rows
        const winW = cellW * 0.6
        const winH = cellH * 0.55
        const litHex = windowColor.toHexString()
        const dimHex = windowColor.scale(0.5).toHexString()
        const doorRow = rows - 1
        const doorCol = Math.floor(cols / 2)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (groundDoor && r === doorRow && c === doorCol) continue
                // Deterministic "some windows lit, some dark" pattern — baked once, so plain Math-based
                // variation (not the cellHash used for per-cell placement) is enough.
                ctx.fillStyle = (r * 31 + c * 17) % 5 === 0 ? dimHex : litHex
                ctx.fillRect(c * cellW + (cellW - winW) / 2, r * cellH + (cellH - winH) / 2, winW, winH)
            }
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.18)'
        ctx.lineWidth = 2
        for (let r = 1; r < rows; r++) {
            ctx.beginPath()
            ctx.moveTo(0, r * cellH)
            ctx.lineTo(size, r * cellH)
            ctx.stroke()
        }

        // Darker foundation band grounds the building instead of the wall color running flat to the ground.
        const foundationH = size * 0.06
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fillRect(0, size - foundationH, size, foundationH)

        if (groundDoor) {
            const doorW = cellW * 0.5
            const doorH = cellH * 0.85
            ctx.fillStyle = 'rgba(58,40,28,0.92)'
            ctx.fillRect((size - doorW) / 2, size - doorH, doorW, doorH)
        }

        texture.update(false)

        const mat = new StandardMaterial(`citygame-walltex-${key}`, this.scene)
        mat.diffuseTexture = texture
        mat.specularColor = Color3.Black()
        this.wallTextures.set(key, mat)
        return mat
    }

    /**
     * A 4-sided cone turned 45° so its base lines up with a square wall. The turn is baked into the
     * vertices: instances don't inherit the master's rotation, so setting it on the master alone left
     * every roof diamond-rotated relative to its house.
     */
    private pyramidRoof(name: string, baseSize: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: baseSize, height, tessellation: 4 }, this.scene)
        mesh.material = mat
        mesh.rotation.y = Math.PI / 4
        mesh.bakeCurrentTransformIntoVertices()
        return mesh
    }

    /** Triangular-prism gable roof, ridge along X, apex up — rotation baked in for the same reason as pyramidRoof. */
    private gableRoof(name: string, length: number, width: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameter: 1, height: length, tessellation: 3 }, this.scene)
        mesh.rotation.z = Math.PI / 2
        mesh.bakeCurrentTransformIntoVertices()
        // Stretch the unit triangle to the requested footprint, then rebase so the eaves sit at local y=0.
        mesh.refreshBoundingInfo()
        const unit = mesh.getBoundingInfo().boundingBox
        mesh.scaling.set(1, height / (unit.maximum.y - unit.minimum.y), width / (unit.maximum.z - unit.minimum.z))
        mesh.bakeCurrentTransformIntoVertices()
        mesh.refreshBoundingInfo()
        mesh.position.y = -mesh.getBoundingInfo().boundingBox.minimum.y
        mesh.bakeCurrentTransformIntoVertices()
        mesh.material = mat
        return mesh
    }

    private sphere(name: string, diameter: number, mat: StandardMaterial, segments = 10): Mesh {
        const mesh = MeshBuilder.CreateSphere(name, { diameter, segments }, this.scene)
        mesh.material = mat
        return mesh
    }

    private disc(name: string, diameter: number, height: number, mat: StandardMaterial, tessellation = 24): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, this.scene)
        mesh.material = mat
        return mesh
    }

    private taper(name: string, bottom: number, top: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameterBottom: bottom, diameterTop: top, height, tessellation: 16 }, this.scene)
        mesh.material = mat
        return mesh
    }

    private part(mesh: Mesh, x: number, y: number, z: number, rotationY = 0, tintable = false): PartTemplate {
        return { mesh, position: new Vector3(x, y, z), rotationY, tintable }
    }

    /** A leafy tree: trunk + two stacked canopy spheres; returns parts positioned around (x, z). */
    private tree(prefix: string, x: number, z: number, scale = 1): PartTemplate[] {
        const trunkMat = this.mat('tree-trunk', new Color3(0.42, 0.3, 0.2))
        const leafMat = this.mat('tree-leaf', new Color3(0.27, 0.55, 0.28))
        const leafLightMat = this.mat('tree-leaf-light', new Color3(0.36, 0.64, 0.32))
        return [
            this.part(this.stack(`${prefix}-trunk`, 0.28 * scale, 1.6 * scale, trunkMat), x, 0.8 * scale, z),
            this.part(this.sphere(`${prefix}-canopy`, 2 * scale, leafMat), x, 2.2 * scale, z),
            this.part(this.sphere(`${prefix}-canopy-top`, 1.3 * scale, leafLightMat), x + 0.2 * scale, 3 * scale, z - 0.1 * scale),
        ]
    }

    private bench(prefix: string, x: number, z: number, rotationY: number): PartTemplate[] {
        const woodMat = this.mat('bench-wood', new Color3(0.55, 0.36, 0.2))
        const ironMat = this.mat('bench-iron', new Color3(0.2, 0.2, 0.22))
        return [
            this.part(this.box(`${prefix}-seat`, 1.4, 0.08, 0.45, woodMat), x, 0.45, z, rotationY),
            this.part(this.box(`${prefix}-back`, 1.4, 0.4, 0.06, woodMat), x, 0.7, z, rotationY),
            this.part(this.box(`${prefix}-legs`, 1.2, 0.42, 0.4, ironMat), x, 0.21, z, rotationY),
        ]
    }

    private flagpole(prefix: string, x: number, z: number, flagColor: Color3): PartTemplate[] {
        const poleMat = this.mat('flag-pole', new Color3(0.8, 0.8, 0.82))
        const flagMat = this.mat(`flag-${flagColor.toHexString()}`, flagColor, true)
        return [
            this.part(this.stack(`${prefix}-pole`, 0.08, 5, poleMat), x, 2.5, z),
            this.part(this.box(`${prefix}-flag`, 1.1, 0.7, 0.03, flagMat), x + 0.58, 4.55, z),
        ]
    }

    // ---- unfunded facility marker ----

    /** A red floating "!" shown over any facility whose owner's treasury couldn't pay this month's upkeep. */
    private buildUnfundedMarkerMaster() {
        const mat = this.mat('unfunded-marker', new Color3(0.95, 0.2, 0.18), true)
        const stem = MeshBuilder.CreateBox('unfunded-stem', { width: 0.5, height: 1.6, depth: 0.5 }, this.scene)
        stem.position.y = 1.1
        const dot = MeshBuilder.CreateBox('unfunded-dot', { width: 0.5, height: 0.5, depth: 0.5 }, this.scene)
        const merged = Mesh.MergeMeshes([stem, dot], true)!
        merged.name = 'unfunded-marker'
        merged.material = mat
        this.unfundedMarkerMaster = merged
        this.hide(merged)
    }

    spawnUnfundedMarker(parent: TransformNode, height: number): Mesh {
        const marker = this.unfundedMarkerMaster.createInstance(`unfunded-${this.counter++}`) as unknown as Mesh
        marker.parent = parent
        marker.isPickable = false
        marker.position.set(0, height, 0)
        return marker
    }

    private stack(name: string, diameter: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation: 12 }, this.scene)
        mesh.material = mat
        return mesh
    }

    private tank(name: string, diameter: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation: 16 }, this.scene)
        mesh.material = mat
        return mesh
    }

    // ---- residential ----
    private buildHouseA(): PartTemplate[] {
        const wallMat = this.windowWallMat('house-a', new Color3(0.93, 0.87, 0.76), new Color3(0.96, 0.82, 0.45), 3, 2, true)
        const roofMat = this.mat('house-roof', new Color3(0.72, 0.33, 0.24))

        return [
            { mesh: this.tintBox('house-body', 4, 3, 4, wallMat, true), position: new Vector3(0, 1.5, 0), rotationY: 0, tintable: true },
            { mesh: this.pyramidRoof('house-roof', 5.6, 1.8, roofMat), position: new Vector3(0, 3.9, 0), rotationY: 0 },
        ]
    }

    /** Flat-roofed cottage — same footprint budget as houseA but a different silhouette + wall texture. */
    private buildHouseB(): PartTemplate[] {
        const wallMat = this.windowWallMat('house-b', new Color3(0.82, 0.78, 0.68), new Color3(0.96, 0.82, 0.45), 4, 2, true)
        const roofMat = this.mat('cottage-roof', new Color3(0.42, 0.4, 0.38))

        return [
            { mesh: this.tintBox('cottage-body', 4.2, 2.6, 3.8, wallMat, true), position: new Vector3(0, 1.3, 0), rotationY: 0, tintable: true },
            { mesh: this.box('cottage-roof', 4.6, 0.35, 4.2, roofMat), position: new Vector3(0, 2.77, 0), rotationY: 0 },
        ]
    }

    private buildDuplex(): PartTemplate[] {
        const wallMat = this.windowWallMat('duplex', new Color3(0.88, 0.83, 0.78), new Color3(0.96, 0.82, 0.45), 2, 3, true)
        const roofMat = this.mat('duplex-roof', new Color3(0.55, 0.3, 0.28))

        const parts: PartTemplate[] = []
        for (const sign of [-1, 1]) {
            parts.push({
                mesh: this.tintBox('duplex-body', 3.4, 4.4, 4, wallMat, true),
                position: new Vector3(sign * 1.15, 2.2, 0),
                rotationY: 0,
                tintable: true,
            })
            parts.push({ mesh: this.pyramidRoof('duplex-roof', 4.6, 1.6, roofMat), position: new Vector3(sign * 1.15, 5.2, 0), rotationY: 0 })
        }
        return parts
    }

    private buildApartment(): PartTemplate[] {
        const wallMat = this.windowWallMat('apartment', new Color3(0.8, 0.78, 0.75), new Color3(0.96, 0.82, 0.45), 4, 7)
        const capMat = this.mat('apt-cap', new Color3(0.4, 0.4, 0.42))

        return [
            { mesh: this.tintBox('apt-body', 5.6, 9, 5.6, wallMat, true), position: new Vector3(0, 4.5, 0), rotationY: 0, tintable: true },
            { mesh: this.box('apt-cap', 6, 0.3, 6, capMat), position: new Vector3(0, 9.15, 0), rotationY: 0 },
        ]
    }

    // ---- commercial ----
    private buildShopA(): PartTemplate[] {
        const wallMat = this.windowWallMat('shop-a', new Color3(0.3, 0.55, 0.68), new Color3(0.75, 0.9, 0.95), 3, 2)
        const canopyMat = this.mat('shop-canopy', new Color3(0.95, 0.95, 0.92))
        const glassMat = this.mat('glass-cyan', new Color3(0.55, 0.85, 0.9), true)

        return [
            { mesh: this.tintBox('shop-body', 4.6, 3.4, 4.6, wallMat, true), position: new Vector3(0, 1.7, 0), rotationY: 0, tintable: true },
            { mesh: this.box('shop-canopy', 4.8, 0.25, 1.2, canopyMat), position: new Vector3(0, 2.4, 2.6), rotationY: 0 },
            { mesh: this.box('shop-glass', 3.8, 1.4, 0.1, glassMat), position: new Vector3(0, 1.2, 2.35), rotationY: 0 },
        ]
    }

    /** Corner kiosk — smaller footprint, a sign pole instead of a canopy. */
    private buildShopB(): PartTemplate[] {
        const wallMat = this.windowWallMat('shop-b', new Color3(0.75, 0.35, 0.32), new Color3(0.95, 0.85, 0.6), 2, 2, true)
        const signMat = this.mat('kiosk-sign', new Color3(0.95, 0.85, 0.2), true)
        const poleMat = this.mat('kiosk-pole', new Color3(0.3, 0.3, 0.32))

        return [
            { mesh: this.tintBox('kiosk-body', 3.4, 2.8, 3.4, wallMat, true), position: new Vector3(0, 1.4, 0), rotationY: 0, tintable: true },
            { mesh: this.stack('kiosk-pole', 0.12, 3, poleMat), position: new Vector3(1.9, 1.5, -1.9), rotationY: 0 },
            { mesh: this.box('kiosk-sign', 1.4, 0.8, 0.1, signMat), position: new Vector3(1.9, 3.1, -1.9), rotationY: 0 },
        ]
    }

    private buildOfficeLow(): PartTemplate[] {
        const wallMat = this.windowWallMat('office-low', new Color3(0.62, 0.65, 0.7), new Color3(0.55, 0.75, 0.92), 4, 6)
        const capMat = this.mat('office-cap', new Color3(0.45, 0.47, 0.5))
        const glassMat = this.mat('glass-blue', new Color3(0.4, 0.65, 0.92), true)

        const parts: PartTemplate[] = [
            { mesh: this.tintBox('office-body', 5.4, 8, 5.4, wallMat, true), position: new Vector3(0, 4, 0), rotationY: 0, tintable: true },
            { mesh: this.box('office-cap', 5.6, 0.3, 5.6, capMat), position: new Vector3(0, 8.15, 0), rotationY: 0 },
            { mesh: this.box('office-ac', 1, 0.6, 1, capMat), position: new Vector3(1.4, 8.6, 1.4), rotationY: 0 },
        ]
        for (let i = 0; i < 2; i++) {
            parts.push({
                mesh: this.box(`office-glass-${i}`, 4.4, 0.9, 0.1, glassMat),
                position: new Vector3(0, 2.2 + i * 3.2, 2.75),
                rotationY: 0,
            })
        }
        return parts
    }

    private buildSkyscraper(): PartTemplate[] {
        const wallMat = this.windowWallMat('skyscraper', new Color3(0.5, 0.53, 0.58), new Color3(0.6, 0.82, 0.98), 4, 12)
        const capMat = this.mat('sky-cap', new Color3(0.35, 0.37, 0.4))
        const glassMat = this.mat('glass-blue-tower', new Color3(0.45, 0.72, 0.95), true)

        const parts: PartTemplate[] = [
            { mesh: this.tintBox('sky-body', 4.2, 18, 4.2, wallMat, true), position: new Vector3(0, 9, 0), rotationY: 0, tintable: true },
            { mesh: this.box('sky-tip', 2.4, 2, 2.4, capMat), position: new Vector3(0, 19, 0), rotationY: 0 },
            { mesh: this.stack('sky-beacon', 0.3, 1, this.beaconMat), position: new Vector3(0, 20.5, 0), rotationY: 0 },
        ]
        for (let i = 0; i < 5; i++) {
            parts.push({
                mesh: this.box(`sky-glass-${i}`, 3.6, 1.1, 0.1, glassMat),
                position: new Vector3(0, 1.5 + i * 3.4, 2.15),
                rotationY: 0,
            })
        }
        return parts
    }

    // ---- industrial ----
    private buildWarehouseA(): PartTemplate[] {
        const wallMat = this.windowWallMat('warehouse-a', new Color3(0.58, 0.6, 0.63), new Color3(0.38, 0.4, 0.42), 5, 1, true)
        const roofMat = this.mat('warehouse-roof', new Color3(0.4, 0.41, 0.44))

        return [
            { mesh: this.tintBox('warehouse-body', 5.8, 2.6, 4.2, wallMat, true), position: new Vector3(0, 1.3, 0), rotationY: 0, tintable: true },
            { mesh: this.box('warehouse-roof', 6, 0.3, 4.4, roofMat), position: new Vector3(0, 2.75, 0), rotationY: 0 },
        ]
    }

    /** Same footprint budget, taller and narrower with two roof vents instead of a plain strip roof. */
    private buildWarehouseB(): PartTemplate[] {
        const wallMat = this.windowWallMat('warehouse-b', new Color3(0.5, 0.54, 0.5), new Color3(0.34, 0.36, 0.32), 4, 2, true)
        const roofMat = this.mat('warehouse2-roof', new Color3(0.34, 0.36, 0.34))
        const ventMat = this.mat('warehouse2-vent', new Color3(0.6, 0.62, 0.58))

        return [
            { mesh: this.tintBox('warehouse2-body', 4.6, 3.4, 5, wallMat, true), position: new Vector3(0, 1.7, 0), rotationY: 0, tintable: true },
            { mesh: this.box('warehouse2-roof', 4.8, 0.3, 5.2, roofMat), position: new Vector3(0, 3.55, 0), rotationY: 0 },
            { mesh: this.box('warehouse2-vent-a', 0.7, 0.5, 0.7, ventMat), position: new Vector3(-1.2, 3.95, 0.5), rotationY: 0 },
            { mesh: this.box('warehouse2-vent-b', 0.7, 0.5, 0.7, ventMat), position: new Vector3(1.2, 3.95, -0.5), rotationY: 0 },
        ]
    }

    private buildFactory(): PartTemplate[] {
        const wallMat = this.windowWallMat('factory', new Color3(0.52, 0.53, 0.56), new Color3(0.36, 0.37, 0.4), 4, 1)
        const roofMat = this.mat('factory-roof', new Color3(0.35, 0.36, 0.38))
        const stackMat = this.mat('factory-stack', new Color3(0.62, 0.4, 0.35))

        return [
            { mesh: this.tintBox('factory-body', 6, 3.2, 4.6, wallMat, true), position: new Vector3(0, 1.6, 0), rotationY: 0, tintable: true },
            { mesh: this.box('factory-roof', 6.2, 0.3, 4.8, roofMat), position: new Vector3(0, 3.35, 0), rotationY: 0 },
            { mesh: this.stack('factory-stack-a', 0.7, 4.5, stackMat), position: new Vector3(-1.6, 5.5, -1), rotationY: 0 },
            { mesh: this.stack('factory-stack-b', 0.7, 3.6, stackMat), position: new Vector3(-0.2, 5.1, -1), rotationY: 0 },
            { mesh: this.stack('factory-beacon', 0.2, 0.5, this.beaconMat), position: new Vector3(-1.6, 8, -1), rotationY: 0 },
        ]
    }

    private buildIndustrialComplex(): PartTemplate[] {
        const wallMat = this.windowWallMat('complex', new Color3(0.48, 0.49, 0.52), new Color3(0.32, 0.33, 0.36), 4, 1)
        const roofMat = this.mat('complex-roof', new Color3(0.3, 0.31, 0.34))
        const stackMat = this.mat('factory-stack', new Color3(0.62, 0.4, 0.35))
        const tankMat = this.mat('complex-tank', new Color3(0.55, 0.58, 0.42))

        return [
            { mesh: this.tintBox('complex-body', 6.4, 3.6, 5, wallMat, true), position: new Vector3(0, 1.8, 0), rotationY: 0, tintable: true },
            { mesh: this.box('complex-roof', 6.6, 0.3, 5.2, roofMat), position: new Vector3(0, 3.75, 0), rotationY: 0 },
            { mesh: this.stack('complex-stack-a', 0.8, 5.5, stackMat), position: new Vector3(-1.8, 6.3, -1.2), rotationY: 0 },
            { mesh: this.stack('complex-stack-b', 0.8, 4.6, stackMat), position: new Vector3(-0.2, 5.9, -1.2), rotationY: 0 },
            { mesh: this.stack('complex-stack-c', 0.8, 5, stackMat), position: new Vector3(1.4, 6.1, -1.2), rotationY: 0 },
            { mesh: this.tank('complex-tank-a', 1.4, 2.4, tankMat), position: new Vector3(2.2, 1.2, 1.6), rotationY: 0 },
            { mesh: this.stack('complex-beacon', 0.2, 0.5, this.beaconMat), position: new Vector3(-1.8, 9.3, -1.2), rotationY: 0 },
        ]
    }

    // ---- player home (the exterior everyone sees on the shared map) ----

    /** Two-storey house on its own lot: gable roof, chimney, porch, path, picket fence, garden tree, mailbox. */
    private buildHome(): PartTemplate[] {
        const lawnMat = this.mat('home-lawn', new Color3(0.42, 0.68, 0.36))
        const wallMat = this.windowWallMat('home', new Color3(0.95, 0.9, 0.8), new Color3(1, 0.85, 0.5), 3, 2, true)
        const roofMat = this.mat('home-roof', new Color3(0.45, 0.2, 0.17))
        const brickMat = this.mat('home-brick', new Color3(0.62, 0.3, 0.22))
        const trimMat = this.mat('home-trim', new Color3(0.97, 0.97, 0.95))
        const pathMat = this.mat('home-path', new Color3(0.78, 0.74, 0.66))
        const mailMat = this.mat('home-mailbox', new Color3(0.2, 0.35, 0.65))

        const parts: PartTemplate[] = [
            this.part(this.box('home-lawn', 7.8, 0.1, 7.8, lawnMat), 0, 0.05, 0),
            this.part(this.tintBox('home-body', 5, 4.2, 4.6, wallMat, true), 0, 2.2, -0.6, 0, true),
            this.part(this.box('home-base', 5.2, 0.3, 4.8, brickMat), 0, 0.15, -0.6),
            this.part(this.gableRoof('home-roof', 5.6, 5.4, 1.9, roofMat), 0, 4.3, -0.6),
            this.part(this.box('home-chimney', 0.6, 1.8, 0.6, brickMat), 1.6, 5.2, -1.4),
            this.part(this.box('home-porch-roof', 2.4, 0.15, 1.3, trimMat), 0, 2.3, 2.3),
            this.part(this.stack('home-porch-col-l', 0.14, 2.2, trimMat), -1.05, 1.1, 2.85),
            this.part(this.stack('home-porch-col-r', 0.14, 2.2, trimMat), 1.05, 1.1, 2.85),
            this.part(this.box('home-porch-step', 2.2, 0.2, 1.2, pathMat), 0, 0.2, 2.3),
            this.part(this.box('home-path', 1, 0.06, 1.6, pathMat), 0, 0.12, 3.35),
            this.part(this.box('home-mailbox', 0.3, 0.3, 0.45, mailMat), 1.2, 1, 3.7),
            this.part(this.stack('home-mailbox-post', 0.08, 0.9, trimMat), 1.2, 0.45, 3.7),
        ]

        // Picket fence along the front and sides, with a gap for the path.
        for (const x of [-3.7, -3, -2.3, -1.6, -0.9, 0.9, 1.6, 2.3, 3, 3.7]) {
            parts.push(this.part(this.box('home-picket', 0.12, 0.8, 0.08, trimMat), x, 0.5, 3.8))
        }
        parts.push(this.part(this.box('home-rail-l', 3, 0.08, 0.06, trimMat), -2.3, 0.65, 3.8))
        parts.push(this.part(this.box('home-rail-r', 3, 0.08, 0.06, trimMat), 2.3, 0.65, 3.8))
        for (const x of [-3.8, 3.8]) {
            parts.push(this.part(this.box('home-rail-side', 0.06, 0.08, 7.6, trimMat), x, 0.65, 0))
        }

        parts.push(...this.tree('home-tree', -2.8, 2.4, 0.9))
        parts.push(...this.tree('home-tree-b', 3, -2.9, 0.75))
        return parts
    }

    // ---- facilities (city services & landmarks — run on the city treasury) ----

    private buildPark(): PartTemplate[] {
        const grassMat = this.mat('park-grass', new Color3(0.36, 0.66, 0.32))
        const pathMat = this.mat('park-path', new Color3(0.85, 0.8, 0.68))
        const stoneMat = this.mat('park-stone', new Color3(0.72, 0.72, 0.74))
        const waterMat = this.mat('park-water', new Color3(0.35, 0.65, 0.95), true)
        const flowerMat = this.mat('park-flower', new Color3(0.95, 0.45, 0.6), true)

        const parts: PartTemplate[] = [
            this.part(this.box('park-grass', 7.8, 0.12, 7.8, grassMat), 0, 0.06, 0),
            this.part(this.box('park-path-x', 7.8, 0.04, 1, pathMat), 0, 0.14, 0),
            this.part(this.box('park-path-z', 1, 0.04, 7.8, pathMat), 0, 0.14, 0),
            this.part(this.disc('park-basin', 2.6, 0.5, stoneMat), 0, 0.35, 0),
            this.part(this.disc('park-water', 2.2, 0.1, waterMat), 0, 0.58, 0),
            this.part(this.disc('park-spout-base', 0.5, 0.8, stoneMat, 12), 0, 0.9, 0),
            this.part(this.disc('park-spout-top', 0.9, 0.15, stoneMat, 12), 0, 1.35, 0),
            this.part(this.sphere('park-spout-water', 0.5, waterMat, 8), 0, 1.6, 0),
        ]
        parts.push(...this.tree('park-tree-a', -2.7, -2.7, 1))
        parts.push(...this.tree('park-tree-b', 2.7, -2.7, 0.85))
        parts.push(...this.tree('park-tree-c', -2.7, 2.7, 0.9))
        parts.push(...this.tree('park-tree-d', 2.7, 2.7, 1.05))
        parts.push(...this.bench('park-bench-a', -1.6, 1.2, 0))
        parts.push(...this.bench('park-bench-b', 1.6, -1.2, Math.PI))
        for (const [x, z] of [[-1.2, -2.4], [2.4, 1.3], [-2.4, 1.3], [1.3, 2.4]]) {
            parts.push(this.part(this.sphere('park-flowers', 0.6, flowerMat, 6), x, 0.25, z))
        }
        return parts
    }

    private buildHospital(): PartTemplate[] {
        const lotMat = this.mat('hosp-lot', new Color3(0.62, 0.63, 0.66))
        const wallMat = this.windowWallMat('hospital', new Color3(0.95, 0.96, 0.97), new Color3(0.55, 0.78, 0.92), 5, 5)
        const capMat = this.mat('hosp-cap', new Color3(0.8, 0.82, 0.85))
        const crossMat = this.mat('hosp-cross', new Color3(0.9, 0.12, 0.15), true)
        const padMat = this.mat('hosp-pad', new Color3(0.25, 0.27, 0.3))
        const glassMat = this.mat('hosp-glass', new Color3(0.5, 0.75, 0.9), true)

        return [
            this.part(this.box('hosp-lot', 7.8, 0.08, 7.8, lotMat), 0, 0.04, 0),
            this.part(this.tintBox('hosp-body', 6, 7, 5, wallMat, true), 0, 3.5, -0.8, 0, true),
            this.part(this.tintBox('hosp-wing', 3, 3.6, 2.4, wallMat, true), 1.8, 1.8, 2.4, 0, true),
            this.part(this.box('hosp-cap', 6.2, 0.3, 5.2, capMat), 0, 7.15, -0.8),
            this.part(this.disc('hosp-helipad', 3, 0.12, padMat), -0.6, 7.36, -0.8),
            this.part(this.box('hosp-cross-v', 0.5, 1.6, 0.12, crossMat), -1.5, 5.6, 1.76),
            this.part(this.box('hosp-cross-h', 1.6, 0.5, 0.12, crossMat), -1.5, 5.6, 1.76),
            this.part(this.box('hosp-roofcross-v', 0.4, 0.05, 1.4, crossMat), -0.6, 7.44, -0.8),
            this.part(this.box('hosp-roofcross-h', 1.4, 0.05, 0.4, crossMat), -0.6, 7.44, -0.8),
            this.part(this.box('hosp-entry-glass', 2.4, 1.6, 0.1, glassMat), -1.5, 0.9, 1.72),
            this.part(this.box('hosp-canopy', 3, 0.15, 1.4, capMat), -1.5, 2, 2.4),
        ]
    }

    private buildPolice(): PartTemplate[] {
        const lotMat = this.mat('police-lot', new Color3(0.55, 0.56, 0.6))
        const wallMat = this.windowWallMat('police', new Color3(0.36, 0.45, 0.62), new Color3(0.75, 0.85, 0.95), 4, 2, true)
        const capMat = this.mat('police-cap', new Color3(0.22, 0.26, 0.34))
        const redLight = this.mat('police-red', new Color3(0.95, 0.15, 0.15), true)
        const blueLight = this.mat('police-blue', new Color3(0.15, 0.4, 0.98), true)
        const badgeMat = this.mat('police-badge', new Color3(0.95, 0.78, 0.25), true)
        const carMat = this.mat('police-car', new Color3(0.96, 0.96, 0.96))
        const carTopMat = this.mat('police-car-top', new Color3(0.12, 0.14, 0.2))

        return [
            this.part(this.box('police-lot', 7.8, 0.08, 7.8, lotMat), 0, 0.04, 0),
            this.part(this.tintBox('police-body', 6, 4, 4.4, wallMat, true), 0, 2, -1.2, 0, true),
            this.part(this.box('police-cap', 6.3, 0.35, 4.7, capMat), 0, 4.17, -1.2),
            this.part(this.box('police-badge', 1, 1, 0.12, badgeMat), 0, 3.2, 1.06),
            this.part(this.box('police-light-r', 0.7, 0.35, 0.35, redLight), -0.4, 4.52, -1.2),
            this.part(this.box('police-light-b', 0.7, 0.35, 0.35, blueLight), 0.4, 4.52, -1.2),
            this.part(this.box('police-car', 2.2, 0.6, 1.1, carMat), -2, 0.4, 2.6),
            this.part(this.box('police-car-top', 1.2, 0.45, 1, carTopMat), -2.1, 0.9, 2.6),
            this.part(this.box('police-car-light', 0.5, 0.12, 0.3, blueLight), -2.1, 1.18, 2.6),
            ...this.flagpole('police-flag', 2.8, 2.6, new Color3(0.9, 0.9, 0.95)),
        ]
    }

    private buildSchool(): PartTemplate[] {
        const fieldMat = this.mat('school-field', new Color3(0.4, 0.66, 0.34))
        const trackMat = this.mat('school-track', new Color3(0.72, 0.38, 0.3))
        const wallMat = this.windowWallMat('school', new Color3(0.74, 0.36, 0.28), new Color3(0.98, 0.92, 0.7), 5, 2, true)
        const roofMat = this.mat('school-roof', new Color3(0.3, 0.3, 0.33))
        const trimMat = this.mat('school-trim', new Color3(0.95, 0.93, 0.88))
        const clockMat = this.mat('school-clock', new Color3(0.98, 0.98, 0.95), true)
        const slideMat = this.mat('school-slide', new Color3(0.98, 0.72, 0.15))

        return [
            this.part(this.box('school-field', 7.8, 0.08, 7.8, fieldMat), 0, 0.04, 0),
            this.part(this.box('school-track', 7, 0.04, 2.6, trackMat), 0, 0.1, 2.4),
            this.part(this.tintBox('school-body', 6.6, 3.6, 3.4, wallMat, true), 0, 1.8, -1.9, 0, true),
            this.part(this.gableRoof('school-roof', 6.9, 3.8, 1.2, roofMat), 0, 3.6, -1.9),
            this.part(this.box('school-tower', 1.4, 2.2, 1.4, trimMat), 0, 4.9, -1.9),
            this.part(this.pyramidRoof('school-tower-roof', 2, 1.2, roofMat), 0, 6.6, -1.9),
            this.part(this.disc('school-clock', 0.9, 0.08, clockMat, 20), 0, 5.2, -1.16),
            this.part(this.box('school-slide', 0.5, 0.08, 2, slideMat), 2.4, 0.7, 2.4, 0.4),
            this.part(this.box('school-slide-ladder', 0.5, 1.4, 0.2, trimMat), 2.7, 0.7, 1.5),
            ...this.flagpole('school-flag', -3, 1, new Color3(0.2, 0.45, 0.9)),
        ]
    }

    /** City landmark — an observation tower (N Seoul Tower motif, since the default map origin is Seoul). */
    private buildLandmark(): PartTemplate[] {
        const plazaMat = this.mat('landmark-plaza', new Color3(0.82, 0.8, 0.76))
        const shaftMat = this.mat('landmark-shaft', new Color3(0.93, 0.93, 0.95))
        const podMat = this.mat('landmark-pod', new Color3(0.4, 0.55, 0.75))
        const deckMat = this.mat('landmark-deck', new Color3(0.8, 0.85, 0.9))
        const glowMat = this.mat('landmark-glow', new Color3(0.55, 0.85, 1), true)

        const parts: PartTemplate[] = [
            this.part(this.disc('landmark-plaza', 7.6, 0.2, plazaMat, 32), 0, 0.1, 0),
            this.part(this.disc('landmark-plinth', 3.2, 1, deckMat, 16), 0, 0.7, 0),
            this.part(this.taper('landmark-shaft', 1.6, 0.9, 22, shaftMat), 0, 12, 0),
            this.part(this.disc('landmark-pod-lower', 3.4, 1.4, podMat, 20), 0, 22.4, 0),
            this.part(this.disc('landmark-pod-glow', 3.5, 0.3, glowMat, 20), 0, 23.2, 0),
            this.part(this.disc('landmark-pod-upper', 3, 1.2, podMat, 20), 0, 24, 0),
            this.part(this.taper('landmark-antenna', 0.5, 0.12, 7, shaftMat), 0, 28.1, 0),
            this.part(this.stack('landmark-beacon', 0.3, 0.6, this.beaconMat), 0, 31.9, 0),
        ]
        parts.push(...this.tree('landmark-tree-a', -3, -3, 0.8))
        parts.push(...this.tree('landmark-tree-b', 3, 3, 0.8))
        parts.push(...this.tree('landmark-tree-c', -3, 3, 0.7))
        parts.push(...this.tree('landmark-tree-d', 3, -3, 0.7))
        return parts
    }
}
