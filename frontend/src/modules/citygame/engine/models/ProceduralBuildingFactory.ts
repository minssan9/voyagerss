import { Animation, Color3, Color4, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import type { BuildingLevel, PlaceableTool } from '../../types'

/** Every master mesh below is authored against this footprint (meters); `spawn()` rescales per-tile. */
const CANONICAL_CELL = 8

type MasterKey = `${PlaceableTool}:${BuildingLevel}`

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
        this.registerVariants('road:1', [this.buildRoadPlain(), this.buildRoadCrosswalk()])

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

    /** Spawns a positioned instance group for one building; caller owns disposing the returned node. */
    spawn(tool: PlaceableTool, level: BuildingLevel, footprintMeters: number, tileId: string, cellX: number, cellY: number): TransformNode {
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

    private resolveKey(tool: PlaceableTool, level: BuildingLevel): MasterKey {
        const key = `${tool}:${level}` as MasterKey
        if (this.masters.has(key)) return key
        return `${tool}:1` as MasterKey
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
    private box(name: string, w: number, h: number, d: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene)
        mesh.material = mat
        return mesh
    }

    /** Like `box`, but registers the instanced-color buffer so `spawn()` can jitter this part's brightness per instance. */
    private tintBox(name: string, w: number, h: number, d: number, mat: StandardMaterial): Mesh {
        const mesh = this.box(name, w, h, d, mat)
        mesh.registerInstancedBuffer('color', 4)
        mesh.instancedBuffers.color = new Color4(1, 1, 1, 1)
        return mesh
    }

    private pyramidRoof(name: string, baseSize: number, height: number, mat: StandardMaterial): Mesh {
        const mesh = MeshBuilder.CreateCylinder(name, { diameterTop: 0, diameterBottom: baseSize, height, tessellation: 4 }, this.scene)
        mesh.material = mat
        mesh.rotation.y = Math.PI / 4
        return mesh
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
        const wallMat = this.mat('house-wall', new Color3(0.93, 0.87, 0.76))
        const roofMat = this.mat('house-roof', new Color3(0.72, 0.33, 0.24))
        const windowMat = this.mat('window-warm', new Color3(0.96, 0.82, 0.45), true)

        return [
            { mesh: this.tintBox('house-body', 4, 3, 4, wallMat), position: new Vector3(0, 1.5, 0), rotationY: 0, tintable: true },
            { mesh: this.pyramidRoof('house-roof', 5.6, 1.8, roofMat), position: new Vector3(0, 3.9, 0), rotationY: 0 },
            { mesh: this.box('house-window', 0.7, 0.6, 0.1, windowMat), position: new Vector3(0, 1.6, 2.05), rotationY: 0 },
        ]
    }

    /** Flat-roofed cottage — same footprint budget as houseA but a different silhouette + side window. */
    private buildHouseB(): PartTemplate[] {
        const wallMat = this.mat('cottage-wall', new Color3(0.82, 0.78, 0.68))
        const roofMat = this.mat('cottage-roof', new Color3(0.42, 0.4, 0.38))
        const windowMat = this.mat('window-warm', new Color3(0.96, 0.82, 0.45), true)

        return [
            { mesh: this.tintBox('cottage-body', 4.2, 2.6, 3.8, wallMat), position: new Vector3(0, 1.3, 0), rotationY: 0, tintable: true },
            { mesh: this.box('cottage-roof', 4.6, 0.35, 4.2, roofMat), position: new Vector3(0, 2.77, 0), rotationY: 0 },
            { mesh: this.box('cottage-window', 0.6, 0.5, 0.1, windowMat), position: new Vector3(1.3, 1.4, 1.95), rotationY: 0 },
            { mesh: this.box('cottage-window-2', 0.1, 0.5, 0.6, windowMat), position: new Vector3(2.15, 1.4, 0.5), rotationY: 0 },
        ]
    }

    private buildDuplex(): PartTemplate[] {
        const wallMat = this.mat('duplex-wall', new Color3(0.88, 0.83, 0.78))
        const roofMat = this.mat('duplex-roof', new Color3(0.55, 0.3, 0.28))
        const windowMat = this.mat('window-warm', new Color3(0.96, 0.82, 0.45), true)

        const parts: PartTemplate[] = []
        for (const sign of [-1, 1]) {
            parts.push({
                mesh: this.tintBox('duplex-body', 3.4, 4.4, 4, wallMat),
                position: new Vector3(sign * 1.15, 2.2, 0),
                rotationY: 0,
                tintable: true,
            })
            parts.push({ mesh: this.pyramidRoof('duplex-roof', 4.6, 1.6, roofMat), position: new Vector3(sign * 1.15, 5.2, 0), rotationY: 0 })
            parts.push({ mesh: this.box('duplex-window', 0.6, 0.5, 0.1, windowMat), position: new Vector3(sign * 1.15, 2.3, 2.05), rotationY: 0 })
        }
        return parts
    }

    private buildApartment(): PartTemplate[] {
        const wallMat = this.mat('apt-wall', new Color3(0.8, 0.78, 0.75))
        const capMat = this.mat('apt-cap', new Color3(0.4, 0.4, 0.42))
        const windowMat = this.mat('window-warm', new Color3(0.96, 0.82, 0.45), true)

        const parts: PartTemplate[] = [
            { mesh: this.tintBox('apt-body', 5.6, 9, 5.6, wallMat), position: new Vector3(0, 4.5, 0), rotationY: 0, tintable: true },
            { mesh: this.box('apt-cap', 6, 0.3, 6, capMat), position: new Vector3(0, 9.15, 0), rotationY: 0 },
        ]
        for (let i = 0; i < 3; i++) {
            const y = 2 + i * 2.6
            parts.push({ mesh: this.box(`apt-band-${i}`, 4.6, 0.6, 0.1, windowMat), position: new Vector3(0, y, 2.85), rotationY: 0 })
        }
        return parts
    }

    // ---- commercial ----
    private buildShopA(): PartTemplate[] {
        const wallMat = this.mat('shop-wall', new Color3(0.3, 0.55, 0.68))
        const canopyMat = this.mat('shop-canopy', new Color3(0.95, 0.95, 0.92))
        const glassMat = this.mat('glass-cyan', new Color3(0.55, 0.85, 0.9), true)

        return [
            { mesh: this.tintBox('shop-body', 4.6, 3.4, 4.6, wallMat), position: new Vector3(0, 1.7, 0), rotationY: 0, tintable: true },
            { mesh: this.box('shop-canopy', 4.8, 0.25, 1.2, canopyMat), position: new Vector3(0, 2.4, 2.6), rotationY: 0 },
            { mesh: this.box('shop-glass', 3.8, 1.4, 0.1, glassMat), position: new Vector3(0, 1.2, 2.35), rotationY: 0 },
        ]
    }

    /** Corner kiosk — smaller footprint, a sign pole instead of a canopy. */
    private buildShopB(): PartTemplate[] {
        const wallMat = this.mat('kiosk-wall', new Color3(0.75, 0.35, 0.32))
        const signMat = this.mat('kiosk-sign', new Color3(0.95, 0.85, 0.2), true)
        const poleMat = this.mat('kiosk-pole', new Color3(0.3, 0.3, 0.32))

        return [
            { mesh: this.tintBox('kiosk-body', 3.4, 2.8, 3.4, wallMat), position: new Vector3(0, 1.4, 0), rotationY: 0, tintable: true },
            { mesh: this.stack('kiosk-pole', 0.12, 3, poleMat), position: new Vector3(1.9, 1.5, -1.9), rotationY: 0 },
            { mesh: this.box('kiosk-sign', 1.4, 0.8, 0.1, signMat), position: new Vector3(1.9, 3.1, -1.9), rotationY: 0 },
        ]
    }

    private buildOfficeLow(): PartTemplate[] {
        const wallMat = this.mat('office-wall', new Color3(0.62, 0.65, 0.7))
        const capMat = this.mat('office-cap', new Color3(0.45, 0.47, 0.5))
        const glassMat = this.mat('glass-blue', new Color3(0.4, 0.65, 0.92), true)

        const parts: PartTemplate[] = [
            { mesh: this.tintBox('office-body', 5.4, 8, 5.4, wallMat), position: new Vector3(0, 4, 0), rotationY: 0, tintable: true },
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
        const wallMat = this.mat('sky-wall', new Color3(0.5, 0.53, 0.58))
        const capMat = this.mat('sky-cap', new Color3(0.35, 0.37, 0.4))
        const glassMat = this.mat('glass-blue-tower', new Color3(0.45, 0.72, 0.95), true)

        const parts: PartTemplate[] = [
            { mesh: this.tintBox('sky-body', 4.2, 18, 4.2, wallMat), position: new Vector3(0, 9, 0), rotationY: 0, tintable: true },
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
        const wallMat = this.mat('warehouse-wall', new Color3(0.58, 0.6, 0.63))
        const roofMat = this.mat('warehouse-roof', new Color3(0.4, 0.41, 0.44))

        return [
            { mesh: this.tintBox('warehouse-body', 5.8, 2.6, 4.2, wallMat), position: new Vector3(0, 1.3, 0), rotationY: 0, tintable: true },
            { mesh: this.box('warehouse-roof', 6, 0.3, 4.4, roofMat), position: new Vector3(0, 2.75, 0), rotationY: 0 },
        ]
    }

    /** Same footprint budget, taller and narrower with two roof vents instead of a plain strip roof. */
    private buildWarehouseB(): PartTemplate[] {
        const wallMat = this.mat('warehouse2-wall', new Color3(0.5, 0.54, 0.5))
        const roofMat = this.mat('warehouse2-roof', new Color3(0.34, 0.36, 0.34))
        const ventMat = this.mat('warehouse2-vent', new Color3(0.6, 0.62, 0.58))

        return [
            { mesh: this.tintBox('warehouse2-body', 4.6, 3.4, 5, wallMat), position: new Vector3(0, 1.7, 0), rotationY: 0, tintable: true },
            { mesh: this.box('warehouse2-roof', 4.8, 0.3, 5.2, roofMat), position: new Vector3(0, 3.55, 0), rotationY: 0 },
            { mesh: this.box('warehouse2-vent-a', 0.7, 0.5, 0.7, ventMat), position: new Vector3(-1.2, 3.95, 0.5), rotationY: 0 },
            { mesh: this.box('warehouse2-vent-b', 0.7, 0.5, 0.7, ventMat), position: new Vector3(1.2, 3.95, -0.5), rotationY: 0 },
        ]
    }

    private buildFactory(): PartTemplate[] {
        const wallMat = this.mat('factory-wall', new Color3(0.52, 0.53, 0.56))
        const roofMat = this.mat('factory-roof', new Color3(0.35, 0.36, 0.38))
        const stackMat = this.mat('factory-stack', new Color3(0.62, 0.4, 0.35))

        return [
            { mesh: this.tintBox('factory-body', 6, 3.2, 4.6, wallMat), position: new Vector3(0, 1.6, 0), rotationY: 0, tintable: true },
            { mesh: this.box('factory-roof', 6.2, 0.3, 4.8, roofMat), position: new Vector3(0, 3.35, 0), rotationY: 0 },
            { mesh: this.stack('factory-stack-a', 0.7, 4.5, stackMat), position: new Vector3(-1.6, 5.5, -1), rotationY: 0 },
            { mesh: this.stack('factory-stack-b', 0.7, 3.6, stackMat), position: new Vector3(-0.2, 5.1, -1), rotationY: 0 },
            { mesh: this.stack('factory-beacon', 0.2, 0.5, this.beaconMat), position: new Vector3(-1.6, 8, -1), rotationY: 0 },
        ]
    }

    private buildIndustrialComplex(): PartTemplate[] {
        const wallMat = this.mat('complex-wall', new Color3(0.48, 0.49, 0.52))
        const roofMat = this.mat('complex-roof', new Color3(0.3, 0.31, 0.34))
        const stackMat = this.mat('factory-stack', new Color3(0.62, 0.4, 0.35))
        const tankMat = this.mat('complex-tank', new Color3(0.55, 0.58, 0.42))

        return [
            { mesh: this.tintBox('complex-body', 6.4, 3.6, 5, wallMat), position: new Vector3(0, 1.8, 0), rotationY: 0, tintable: true },
            { mesh: this.box('complex-roof', 6.6, 0.3, 5.2, roofMat), position: new Vector3(0, 3.75, 0), rotationY: 0 },
            { mesh: this.stack('complex-stack-a', 0.8, 5.5, stackMat), position: new Vector3(-1.8, 6.3, -1.2), rotationY: 0 },
            { mesh: this.stack('complex-stack-b', 0.8, 4.6, stackMat), position: new Vector3(-0.2, 5.9, -1.2), rotationY: 0 },
            { mesh: this.stack('complex-stack-c', 0.8, 5, stackMat), position: new Vector3(1.4, 6.1, -1.2), rotationY: 0 },
            { mesh: this.tank('complex-tank-a', 1.4, 2.4, tankMat), position: new Vector3(2.2, 1.2, 1.6), rotationY: 0 },
            { mesh: this.stack('complex-beacon', 0.2, 0.5, this.beaconMat), position: new Vector3(-1.8, 9.3, -1.2), rotationY: 0 },
        ]
    }

    // ---- road ----
    private buildRoadPlain(): PartTemplate[] {
        const roadMat = this.mat('road-surface', new Color3(0.28, 0.29, 0.31))
        const stripeMat = this.mat('road-stripe', new Color3(0.92, 0.8, 0.25), true)

        const stripe = MeshBuilder.CreatePlane('road-stripe', { width: 0.35, height: CANONICAL_CELL * 0.9 }, this.scene)
        stripe.material = stripeMat
        stripe.rotation.x = Math.PI / 2

        return [
            { mesh: this.box('road-surface', CANONICAL_CELL, 0.15, CANONICAL_CELL, roadMat), position: new Vector3(0, 0.075, 0), rotationY: 0 },
            { mesh: stripe, position: new Vector3(0, 0.16, 0), rotationY: 0 },
        ]
    }

    /** Road with a painted crosswalk instead of a center line — visual variety for an intersection-flavored cell. */
    private buildRoadCrosswalk(): PartTemplate[] {
        const roadMat = this.mat('road2-surface', new Color3(0.26, 0.27, 0.29))
        const paintMat = this.mat('road-paint', new Color3(0.88, 0.88, 0.85), true)

        const parts: PartTemplate[] = [
            { mesh: this.box('road2-surface', CANONICAL_CELL, 0.15, CANONICAL_CELL, roadMat), position: new Vector3(0, 0.075, 0), rotationY: 0 },
        ]
        for (let i = 0; i < 5; i++) {
            const stripe = MeshBuilder.CreatePlane(`crosswalk-${i}`, { width: 0.5, height: 1.6 }, this.scene)
            stripe.material = paintMat
            stripe.rotation.x = Math.PI / 2
            parts.push({ mesh: stripe, position: new Vector3(-2 + i, 0.16, 0), rotationY: 0 })
        }
        return parts
    }
}
