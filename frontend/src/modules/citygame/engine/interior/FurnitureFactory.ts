import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core'
import { FURNITURE_BY_ID } from './catalog'

type Maker = (root: TransformNode) => void

/**
 * Builds Sims-style furniture out of primitives. Interiors hold a few dozen
 * items at most, so unlike the city's ProceduralBuildingFactory these are
 * plain meshes (no instancing) — which also lets a placement ghost fade an
 * item's own materials without touching every other copy.
 *
 * Convention: every item is authored centered on its footprint at rotation
 * 0 with its front (the side a Sim uses it from) facing +z; 1 grid cell = 1m.
 */
export class FurnitureFactory {
    private materials = new Map<string, StandardMaterial>()
    private makers: Record<string, Maker>
    private counter = 0

    constructor(private scene: Scene) {
        this.makers = {
            fridge: (r) => this.fridge(r),
            stove: (r) => this.stove(r),
            'dining-table': (r) => this.diningTable(r),
            chair: (r) => this.chair(r),
            sofa: (r) => this.sofa(r),
            armchair: (r) => this.armchair(r),
            bed: (r) => this.bed(r),
            toilet: (r) => this.toilet(r),
            shower: (r) => this.shower(r),
            tv: (r) => this.tv(r),
            bookshelf: (r) => this.bookshelf(r),
            'chess-table': (r) => this.chessTable(r),
            computer: (r) => this.computer(r),
            plant: (r) => this.plant(r),
            lamp: (r) => this.lamp(r),
            clock: (r) => this.grandfatherClock(r),
        }
    }

    create(itemId: string): TransformNode {
        const root = new TransformNode(`furn-${itemId}-${this.counter++}`, this.scene)
        const make = this.makers[itemId]
        if (make && FURNITURE_BY_ID[itemId]) make(root)
        return root
    }

    // ---- helpers ----

    private mat(key: string, color: Color3, opts: { emissive?: number; alpha?: number; specular?: number } = {}): StandardMaterial {
        const cacheKey = `${key}:${color.toHexString()}:${opts.emissive ?? 0}:${opts.alpha ?? 1}`
        const cached = this.materials.get(cacheKey)
        if (cached) return cached
        const m = new StandardMaterial(`furn-mat-${key}-${this.materials.size}`, this.scene)
        m.diffuseColor = color
        m.specularColor = new Color3(opts.specular ?? 0.08, opts.specular ?? 0.08, opts.specular ?? 0.08)
        if (opts.emissive) m.emissiveColor = color.scale(opts.emissive)
        if (opts.alpha !== undefined) m.alpha = opts.alpha
        this.materials.set(cacheKey, m)
        return m
    }

    private box(root: TransformNode, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial): Mesh {
        const m = MeshBuilder.CreateBox(`${root.name}-b${this.counter++}`, { width: w, height: h, depth: d }, this.scene)
        m.material = mat
        m.parent = root
        m.position.set(x, y, z)
        return m
    }

    private cyl(root: TransformNode, dTop: number, dBottom: number, h: number, x: number, y: number, z: number, mat: StandardMaterial, tess = 16): Mesh {
        const m = MeshBuilder.CreateCylinder(`${root.name}-c${this.counter++}`, { diameterTop: dTop, diameterBottom: dBottom, height: h, tessellation: tess }, this.scene)
        m.material = mat
        m.parent = root
        m.position.set(x, y, z)
        return m
    }

    private ball(root: TransformNode, diameter: number, x: number, y: number, z: number, mat: StandardMaterial): Mesh {
        const m = MeshBuilder.CreateSphere(`${root.name}-s${this.counter++}`, { diameter, segments: 10 }, this.scene)
        m.material = mat
        m.parent = root
        m.position.set(x, y, z)
        return m
    }

    private legs(root: TransformNode, w: number, d: number, h: number, t: number, mat: StandardMaterial) {
        for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) {
                this.box(root, t, h, t, sx * (w / 2 - t / 2), h / 2, sz * (d / 2 - t / 2), mat)
            }
        }
    }

    private wood = () => this.mat('wood', new Color3(0.52, 0.33, 0.19))
    private darkWood = () => this.mat('dark-wood', new Color3(0.3, 0.19, 0.12))
    private white = () => this.mat('white', new Color3(0.94, 0.94, 0.95), { specular: 0.3 })
    private chrome = () => this.mat('chrome', new Color3(0.72, 0.74, 0.78), { specular: 0.6 })
    private black = () => this.mat('black', new Color3(0.08, 0.08, 0.1), { specular: 0.4 })

    // ---- kitchen ----

    private fridge(r: TransformNode) {
        const body = this.mat('fridge', new Color3(0.9, 0.91, 0.93), { specular: 0.5 })
        this.box(r, 0.8, 1.85, 0.72, 0, 0.925, -0.08, body)
        this.box(r, 0.8, 0.02, 0.02, 0, 1.25, 0.29, this.mat('seam', new Color3(0.55, 0.56, 0.6)))
        this.box(r, 0.04, 0.35, 0.05, 0.3, 1.5, 0.31, this.chrome())
        this.box(r, 0.04, 0.5, 0.05, 0.3, 0.85, 0.31, this.chrome())
    }

    private stove(r: TransformNode) {
        this.box(r, 0.85, 0.88, 0.72, 0, 0.44, -0.08, this.white())
        this.box(r, 0.85, 0.03, 0.72, 0, 0.895, -0.08, this.black())
        const burner = this.mat('burner', new Color3(0.2, 0.2, 0.22))
        for (const x of [-0.2, 0.2]) for (const z of [-0.28, 0.08]) this.cyl(r, 0.2, 0.2, 0.02, x, 0.92, z, burner, 12)
        this.box(r, 0.6, 0.35, 0.02, 0, 0.45, 0.29, this.mat('oven-glass', new Color3(0.12, 0.12, 0.15), { specular: 0.8 }))
        for (const x of [-0.3, -0.1, 0.1, 0.3]) this.cyl(r, 0.05, 0.05, 0.04, x, 0.78, 0.29, this.chrome(), 8).rotation.x = Math.PI / 2
    }

    private diningTable(r: TransformNode) {
        const top = this.mat('table-top', new Color3(0.42, 0.26, 0.15), { specular: 0.25 })
        this.box(r, 1.8, 0.06, 0.9, 0, 0.75, 0, top)
        this.legs(r, 1.7, 0.8, 0.72, 0.07, this.darkWood())
        const plate = this.mat('plate', new Color3(0.97, 0.97, 0.96))
        for (const x of [-0.5, 0.5]) this.cyl(r, 0.24, 0.2, 0.02, x, 0.79, 0.15, plate, 16)
        this.cyl(r, 0.1, 0.14, 0.22, 0, 0.89, -0.1, this.mat('vase', new Color3(0.3, 0.55, 0.75), { specular: 0.5 }))
        this.ball(r, 0.22, 0, 1.06, -0.1, this.mat('flowers', new Color3(0.95, 0.55, 0.65), { emissive: 0.1 }))
    }

    // ---- seating ----

    private chair(r: TransformNode) {
        const seat = this.mat('chair-seat', new Color3(0.2, 0.2, 0.22))
        this.box(r, 0.46, 0.05, 0.46, 0, 0.45, 0, seat)
        this.box(r, 0.46, 0.55, 0.05, 0, 0.75, -0.2, this.darkWood())
        this.legs(r, 0.44, 0.44, 0.44, 0.045, this.darkWood())
    }

    private sofa(r: TransformNode) {
        const fabric = this.mat('sofa', new Color3(0.18, 0.3, 0.62))
        const cushion = this.mat('sofa-cushion', new Color3(0.24, 0.38, 0.72))
        this.box(r, 1.9, 0.32, 0.82, 0, 0.26, 0, fabric)
        this.box(r, 1.9, 0.5, 0.2, 0, 0.62, -0.31, fabric)
        for (const sx of [-1, 1]) this.box(r, 0.16, 0.5, 0.82, sx * 0.87, 0.35, 0, fabric)
        for (const x of [-0.42, 0.42]) this.box(r, 0.8, 0.12, 0.6, x, 0.48, 0.08, cushion)
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(r, 0.06, 0.1, 0.06, sx * 0.88, 0.05, sz * 0.36, this.darkWood())
    }

    private armchair(r: TransformNode) {
        const leather = this.mat('leather', new Color3(0.12, 0.12, 0.13), { specular: 0.35 })
        this.box(r, 0.86, 0.3, 0.8, 0, 0.25, 0, leather)
        this.box(r, 0.86, 0.55, 0.18, 0, 0.62, -0.31, leather)
        for (const sx of [-1, 1]) this.box(r, 0.14, 0.45, 0.8, sx * 0.36, 0.38, 0, leather)
        this.box(r, 0.58, 0.1, 0.56, 0, 0.45, 0.06, this.mat('leather-cushion', new Color3(0.18, 0.18, 0.2), { specular: 0.3 }))
    }

    // ---- bedroom ----

    private bed(r: TransformNode) {
        this.box(r, 0.98, 0.32, 1.96, 0, 0.2, 0, this.wood())
        this.box(r, 0.98, 0.9, 0.08, 0, 0.5, -0.96, this.darkWood())
        this.box(r, 0.9, 0.2, 1.84, 0, 0.46, 0.02, this.mat('mattress', new Color3(0.95, 0.95, 0.93)))
        this.box(r, 0.92, 0.1, 1.2, 0, 0.6, 0.36, this.mat('blanket', new Color3(0.72, 0.22, 0.3)))
        this.box(r, 0.6, 0.1, 0.3, 0, 0.62, -0.7, this.mat('pillow', new Color3(0.98, 0.98, 1)))
    }

    // ---- bathroom ----

    private toilet(r: TransformNode) {
        const porcelain = this.mat('porcelain', new Color3(0.97, 0.97, 0.98), { specular: 0.6 })
        this.cyl(r, 0.42, 0.3, 0.4, 0, 0.2, 0.06, porcelain, 20)
        this.cyl(r, 0.44, 0.44, 0.04, 0, 0.42, 0.06, this.mat('seat', new Color3(0.9, 0.9, 0.92), { specular: 0.4 }), 20)
        this.box(r, 0.44, 0.4, 0.2, 0, 0.62, -0.26, porcelain)
    }

    private shower(r: TransformNode) {
        this.box(r, 0.96, 0.08, 0.96, 0, 0.04, 0, this.mat('shower-tray', new Color3(0.85, 0.9, 0.95), { specular: 0.5 }))
        const glass = this.mat('shower-glass', new Color3(0.7, 0.85, 0.95), { alpha: 0.35, specular: 0.9 })
        this.box(r, 0.96, 1.9, 0.03, 0, 1.03, -0.465, glass)
        for (const sx of [-1, 1]) this.box(r, 0.03, 1.9, 0.96, sx * 0.465, 1.03, 0, glass)
        this.box(r, 0.5, 1.9, 0.03, -0.23, 1.03, 0.465, glass)
        this.cyl(r, 0.04, 0.04, 1.9, 0.3, 1.03, -0.4, this.chrome(), 8)
        this.cyl(r, 0.18, 0.1, 0.05, 0.3, 1.95, -0.3, this.chrome(), 12)
    }

    // ---- fun ----

    private tv(r: TransformNode) {
        this.box(r, 0.95, 0.45, 0.45, 0, 0.225, -0.2, this.darkWood())
        this.box(r, 0.88, 0.52, 0.07, 0, 0.75, -0.25, this.black())
        const screen = this.mat('tv-screen', new Color3(0.35, 0.6, 0.95), { emissive: 0.7 })
        this.box(r, 0.8, 0.44, 0.01, 0, 0.75, -0.21, screen)
    }

    private bookshelf(r: TransformNode) {
        const frame = this.wood()
        this.box(r, 0.9, 1.8, 0.05, 0, 0.9, -0.15, frame)
        for (const sx of [-1, 1]) this.box(r, 0.04, 1.8, 0.34, sx * 0.43, 0.9, 0, frame)
        const bookColors = [
            new Color3(0.7, 0.2, 0.2),
            new Color3(0.2, 0.35, 0.65),
            new Color3(0.25, 0.55, 0.3),
            new Color3(0.85, 0.7, 0.3),
            new Color3(0.45, 0.3, 0.55),
        ]
        for (let shelf = 0; shelf < 4; shelf++) {
            const y = 0.05 + shelf * 0.44
            this.box(r, 0.84, 0.03, 0.32, 0, y, 0, frame)
            let x = -0.38
            for (let i = 0; x < 0.36; i++) {
                const w = 0.05 + ((shelf * 7 + i * 3) % 4) * 0.015
                const h = 0.24 + ((shelf + i) % 3) * 0.04
                this.box(r, w, h, 0.24, x + w / 2, y + 0.015 + h / 2, 0.02, this.mat(`book-${(shelf + i) % 5}`, bookColors[(shelf * 2 + i) % 5]))
                x += w + 0.01
            }
        }
    }

    private chessTable(r: TransformNode) {
        this.cyl(r, 0.7, 0.7, 0.05, 0, 0.68, 0, this.darkWood(), 24)
        this.cyl(r, 0.1, 0.12, 0.66, 0, 0.33, 0, this.darkWood(), 12)
        this.cyl(r, 0.45, 0.45, 0.04, 0, 0.02, 0, this.darkWood(), 16)
        const board = MeshBuilder.CreateBox(`${r.name}-board`, { width: 0.44, height: 0.02, depth: 0.44 }, this.scene)
        board.parent = r
        board.position.set(0, 0.715, 0)
        board.material = this.checkerMat()
        const w = this.mat('piece-w', new Color3(0.95, 0.93, 0.88))
        const b = this.mat('piece-b', new Color3(0.1, 0.1, 0.12))
        for (let i = 0; i < 4; i++) {
            this.cyl(r, 0.03, 0.05, 0.08, -0.15 + i * 0.1, 0.765, 0.16, w, 8)
            this.cyl(r, 0.03, 0.05, 0.08, -0.15 + i * 0.1, 0.765, -0.16, b, 8)
        }
    }

    private checkerMat(): StandardMaterial {
        const cached = this.materials.get('checker')
        if (cached) return cached
        const tex = new DynamicTexture('checker-tex', 128, this.scene, false)
        const ctx = tex.getContext() as CanvasRenderingContext2D
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#efe6d2' : '#5b3a22'
                ctx.fillRect(i * 16, j * 16, 16, 16)
            }
        }
        tex.update(false)
        const m = new StandardMaterial('furn-mat-checker', this.scene)
        m.diffuseTexture = tex
        m.specularColor = new Color3(0.1, 0.1, 0.1)
        this.materials.set('checker', m)
        return m
    }

    private computer(r: TransformNode) {
        this.box(r, 0.95, 0.04, 0.6, 0, 0.74, -0.1, this.wood())
        for (const sx of [-1, 1]) this.box(r, 0.04, 0.72, 0.56, sx * 0.45, 0.36, -0.1, this.wood())
        this.box(r, 0.5, 0.32, 0.03, 0, 1.0, -0.28, this.black())
        this.box(r, 0.46, 0.28, 0.01, 0, 1.0, -0.26, this.mat('monitor', new Color3(0.3, 0.75, 0.55), { emissive: 0.7 }))
        this.box(r, 0.06, 0.12, 0.06, 0, 0.82, -0.3, this.black())
        this.box(r, 0.4, 0.02, 0.14, 0, 0.77, 0.05, this.mat('keyboard', new Color3(0.85, 0.85, 0.87)))
        this.box(r, 0.18, 0.42, 0.4, 0.33, 0.21, -0.12, this.mat('tower', new Color3(0.8, 0.8, 0.82)))
    }

    // ---- decor ----

    private plant(r: TransformNode) {
        this.cyl(r, 0.4, 0.28, 0.38, 0, 0.19, 0, this.mat('pot', new Color3(0.72, 0.38, 0.24)), 16)
        const leaf = this.mat('leaf', new Color3(0.24, 0.52, 0.24))
        const leafLight = this.mat('leaf-light', new Color3(0.34, 0.62, 0.3))
        this.ball(r, 0.5, 0, 0.62, 0, leaf)
        this.ball(r, 0.34, 0.14, 0.86, 0.05, leafLight)
        this.ball(r, 0.3, -0.12, 0.82, -0.08, leafLight)
    }

    private lamp(r: TransformNode) {
        this.cyl(r, 0.28, 0.32, 0.04, 0, 0.02, 0, this.chrome(), 16)
        this.cyl(r, 0.035, 0.035, 1.35, 0, 0.7, 0, this.chrome(), 8)
        this.cyl(r, 0.22, 0.42, 0.32, 0, 1.45, 0, this.mat('shade', new Color3(1, 0.9, 0.7), { emissive: 0.55 }), 16)
    }

    private grandfatherClock(r: TransformNode) {
        const body = this.mat('clock-wood', new Color3(0.38, 0.2, 0.12), { specular: 0.3 })
        this.box(r, 0.52, 1.95, 0.36, 0, 0.975, -0.05, body)
        this.box(r, 0.6, 0.08, 0.42, 0, 1.99, -0.05, body)
        const face = this.cyl(r, 0.34, 0.34, 0.02, 0, 1.6, 0.14, this.mat('clock-face', new Color3(0.98, 0.96, 0.9)), 24)
        face.rotation.x = Math.PI / 2
        this.box(r, 0.3, 0.8, 0.01, 0, 0.85, 0.135, this.mat('clock-glass', new Color3(0.2, 0.15, 0.1), { specular: 0.8 }))
        this.cyl(r, 0.14, 0.14, 0.01, 0, 0.6, 0.145, this.mat('pendulum', new Color3(0.92, 0.75, 0.3), { specular: 0.8 }), 16).rotation.x = Math.PI / 2
    }
}
