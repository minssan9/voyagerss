import {
    Engine,
    WebGPUEngine,
    Scene,
    Color3,
    Color4,
    Vector3,
    HemisphericLight,
    DirectionalLight,
    ShadowGenerator,
    MeshBuilder,
    StandardMaterial,
    AbstractMesh,
} from '@babylonjs/core'
import type { RendererBackend } from '../types'

export interface GameEngineHandles {
    engine: Engine | WebGPUEngine
    scene: Scene
    backend: RendererBackend
}

/**
 * Owns the Babylon.js render surface: engine creation (WebGPU with WebGL2
 * fallback), the base scene/lighting/ground, and the render loop lifecycle.
 */
export class GameEngine {
    private canvas: HTMLCanvasElement
    private engine!: Engine | WebGPUEngine
    private scene!: Scene
    private shadowGenerator!: ShadowGenerator
    private resizeObserver?: ResizeObserver
    public backend: RendererBackend = 'webgl2'

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
    }

    static async isWebGPUSupported(): Promise<boolean> {
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false
        try {
            return await WebGPUEngine.IsSupportedAsync
        } catch {
            return false
        }
    }

    async init(): Promise<GameEngineHandles> {
        if (await GameEngine.isWebGPUSupported()) {
            try {
                const webgpuEngine = new WebGPUEngine(this.canvas, {
                    antialias: true,
                    powerPreference: 'high-performance',
                })
                await webgpuEngine.initAsync()
                this.engine = webgpuEngine
                this.backend = 'webgpu'
            } catch (err) {
                console.warn('[citygame] WebGPU init failed, falling back to WebGL2', err)
                this.engine = this.createWebGLEngine()
                this.backend = 'webgl2'
            }
        } else {
            this.engine = this.createWebGLEngine()
            this.backend = 'webgl2'
        }

        this.scene = this.buildScene()
        this.startRenderLoop()
        this.watchResize()

        return { engine: this.engine, scene: this.scene, backend: this.backend }
    }

    private createWebGLEngine(): Engine {
        return new Engine(this.canvas, true, {
            antialias: true,
            powerPreference: 'high-performance',
            stencil: true,
            disableWebGL2Support: false,
        })
    }

    private buildScene(): Scene {
        const scene = new Scene(this.engine)
        scene.clearColor = new Color4(0.86, 0.89, 0.93, 1)
        scene.autoClear = true
        // Grid environments carry a lot of static geometry; freeze what we can.
        scene.blockMaterialDirtyMechanism = true

        const sun = new DirectionalLight('sun', new Vector3(-0.45, -1, -0.28), scene)
        sun.position = new Vector3(60, 120, 60)
        sun.intensity = 1.05

        const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene)
        ambient.intensity = 0.55

        this.shadowGenerator = new ShadowGenerator(2048, sun)
        this.shadowGenerator.useBlurExponentialShadowMap = true
        this.shadowGenerator.blurKernel = 32
        this.shadowGenerator.setDarkness(0.25)

        const ground = MeshBuilder.CreateGround('ground', { width: 400, height: 400, subdivisions: 2 }, scene)
        const groundMat = new StandardMaterial('groundMat', scene)
        groundMat.diffuseColor = new Color3(0.76, 0.79, 0.75)
        groundMat.specularColor = Color3.Black()
        ground.material = groundMat
        ground.receiveShadows = true
        ground.checkCollisions = true

        return scene
    }

    addShadowCaster(mesh: AbstractMesh) {
        this.shadowGenerator?.addShadowCaster(mesh)
    }

    private startRenderLoop() {
        this.engine.runRenderLoop(() => {
            this.scene.render()
        })
    }

    private handleWindowResize = () => this.engine.resize()

    private watchResize() {
        this.resizeObserver = new ResizeObserver(() => this.engine.resize())
        this.resizeObserver.observe(this.canvas)
        window.addEventListener('resize', this.handleWindowResize)
    }

    getScene(): Scene {
        return this.scene
    }

    getEngine(): Engine | WebGPUEngine {
        return this.engine
    }

    getFps(): number {
        return this.engine?.getFps() ?? 0
    }

    dispose() {
        this.resizeObserver?.disconnect()
        window.removeEventListener('resize', this.handleWindowResize)
        this.scene?.dispose()
        this.engine?.dispose()
    }
}
