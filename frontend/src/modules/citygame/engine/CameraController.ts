import { ArcRotateCamera, UniversalCamera, Scene, Vector3 } from '@babylonjs/core'
import type { GameAction } from '../config/actions'
import type { CameraMode } from '../types'
import { FreeRoamController, type FreeRoamHooks } from './FreeRoamController'

const PLANNING = {
    alpha: -Math.PI / 2,
    beta: Math.PI / 3.4,
    radius: 120,
}

const TRANSITION_MS = 600

function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Owns both views — the top-down planning camera (SimCity) and GTA-style
 * third-person free roam (see FreeRoamController) — and cross-fades
 * position/target between them with a requestAnimationFrame lerp so
 * switching views never feels like a hard cut.
 */
export class CameraController {
    public mode: CameraMode = 'planning'
    private isTransitioning = false
    private transitionHandle: number | null = null
    /** While a build tool is active, left-drag should paint the grid, not orbit the camera. */
    private buildModeActive = false

    private planningCamera: ArcRotateCamera
    readonly freeRoam: FreeRoamController
    private transitionCamera: UniversalCamera
    private scene: Scene
    private canvas: HTMLCanvasElement

    private readonly panSpeed = 0.6
    private readonly rotateSpeed = 0.022

    constructor(
        scene: Scene,
        canvas: HTMLCanvasElement,
        private onModeChange: ((mode: CameraMode) => void) | undefined,
        freeRoamHooks: FreeRoamHooks,
        /** Where the avatar appears when entering free roam (e.g. your front door) — defaults to the planning target. */
        private spawnPoint: () => Vector3 | null = () => null,
    ) {
        this.scene = scene
        this.canvas = canvas

        this.planningCamera = new ArcRotateCamera(
            'planningCamera',
            PLANNING.alpha,
            PLANNING.beta,
            PLANNING.radius,
            Vector3.Zero(),
            scene,
        )
        this.planningCamera.lowerRadiusLimit = 30
        this.planningCamera.upperRadiusLimit = 260
        this.planningCamera.lowerBetaLimit = 0.15
        this.planningCamera.upperBetaLimit = Math.PI / 2.1
        this.planningCamera.wheelPrecision = 15
        this.planningCamera.panningSensibility = 60
        this.planningCamera.pinchPrecision = 80
        this.planningCamera.attachControl(canvas, true)

        this.freeRoam = new FreeRoamController(scene, canvas, freeRoamHooks)

        this.transitionCamera = new UniversalCamera('transitionCamera', Vector3.Zero(), scene)

        scene.activeCamera = this.planningCamera
    }

    toggle() {
        this.setMode(this.mode === 'planning' ? 'walkthrough' : 'planning')
    }

    setMode(targetMode: CameraMode) {
        if (targetMode === this.mode || this.isTransitioning) return
        this.isTransitioning = true

        const activeCamera = this.scene.activeCamera as ArcRotateCamera | UniversalCamera
        const fromPos = activeCamera.position.clone()
        const fromTarget = (this.mode === 'planning' ? this.planningCamera.target : this.freeRoam.camera.target).clone()

        // Entering: land behind the avatar at its spawn. Leaving: re-center the planning view on wherever you roamed to.
        const spawn = targetMode === 'walkthrough' ? this.spawnPoint() ?? this.planningCamera.target.clone() : null
        if (targetMode === 'planning') {
            const roamed = this.freeRoam.focusPoint()
            this.planningCamera.target.set(roamed.x, 0, roamed.z)
            this.freeRoam.disable()
        }
        const toTarget = spawn ? new Vector3(spawn.x, 1.35, spawn.z) : this.planningCamera.target.clone()
        // The avatar spawns facing its home (−z), so the chase camera starts on the street side looking at the house.
        const toPos = spawn
            ? new Vector3(spawn.x, 1.35 + 7 * Math.cos(1.2), spawn.z + 7 * Math.sin(1.2))
            : this.planningCamera.target.add(this.planningOffset())

        this.planningCamera.detachControl()
        this.transitionCamera.position.copyFrom(fromPos)
        this.transitionCamera.setTarget(fromTarget)
        this.scene.activeCamera = this.transitionCamera

        const start = performance.now()
        const step = () => {
            const t = Math.min(1, (performance.now() - start) / TRANSITION_MS)
            const eased = easeInOutQuad(t)
            Vector3.LerpToRef(fromPos, toPos, eased, this.transitionCamera.position)
            this.transitionCamera.setTarget(Vector3.Lerp(fromTarget, toTarget, eased))

            if (t < 1) {
                this.transitionHandle = requestAnimationFrame(step)
                return
            }

            this.mode = targetMode
            this.isTransitioning = false
            this.transitionHandle = null
            this.onModeChange?.(targetMode)

            if (targetMode === 'walkthrough') {
                this.freeRoam.enable(spawn!, Math.PI)
            } else {
                this.scene.activeCamera = this.planningCamera
                if (!this.buildModeActive) this.planningCamera.attachControl(this.canvas, true)
            }
        }
        this.transitionHandle = requestAnimationFrame(step)
    }

    /** WASD/QE still pan/rotate either way — this only decides whether mouse-drag orbits or is free for painting. */
    setBuildModeActive(active: boolean) {
        this.buildModeActive = active
        if (this.mode !== 'planning' || this.isTransitioning) return
        if (active) {
            this.planningCamera.detachControl()
        } else {
            this.planningCamera.attachControl(this.canvas, true)
        }
    }

    private planningOffset(): Vector3 {
        const c = this.planningCamera
        return new Vector3(
            c.radius * Math.cos(c.alpha) * Math.sin(c.beta),
            c.radius * Math.cos(c.beta),
            c.radius * Math.sin(c.alpha) * Math.sin(c.beta),
        )
    }

    /** Called once per frame with the set of currently-active actions (from keyboard and/or gamepad). */
    update(activeActions: ReadonlySet<GameAction>, deltaMs: number) {
        if (this.isTransitioning) return
        if (this.mode === 'walkthrough') {
            this.freeRoam.update(activeActions, deltaMs / 1000)
            return
        }
        const scale = deltaMs / 16.67

        let dx = 0
        let dz = 0
        if (activeActions.has('pan-forward')) dz -= 1
        if (activeActions.has('pan-back')) dz += 1
        if (activeActions.has('pan-left')) dx -= 1
        if (activeActions.has('pan-right')) dx += 1

        if (dx !== 0 || dz !== 0) {
            const forward = new Vector3(Math.sin(this.planningCamera.alpha), 0, Math.cos(this.planningCamera.alpha))
            const right = new Vector3(forward.z, 0, -forward.x)
            const move = forward.scale(dz).add(right.scale(dx)).normalize().scale(this.panSpeed * scale)
            this.planningCamera.target.addInPlace(move)
        }

        if (activeActions.has('rotate-left')) this.planningCamera.alpha -= this.rotateSpeed * scale
        if (activeActions.has('rotate-right')) this.planningCamera.alpha += this.rotateSpeed * scale
    }

    /** Where the player is looking/standing, in world meters — used to resolve which map tile is under view. */
    getPlanningTarget(): Vector3 {
        return this.mode === 'walkthrough' ? this.freeRoam.focusPoint() : this.planningCamera.target
    }

    /** Camera distance, in meters — the signal for how many neighbouring tiles to stream in. */
    getPlanningRadius(): number {
        return this.mode === 'walkthrough' ? 40 : this.planningCamera.radius
    }

    /** Hands the canvas back and forth when the page switches between the city and a home interior. */
    suspend() {
        this.planningCamera.detachControl()
        this.freeRoam.camera.detachControl()
    }

    resume() {
        this.freeRoam.clearInput()
        if (this.mode === 'walkthrough') this.freeRoam.camera.attachControl(this.canvas, true)
        else if (!this.buildModeActive) this.planningCamera.attachControl(this.canvas, true)
    }

    dispose() {
        if (this.transitionHandle !== null) cancelAnimationFrame(this.transitionHandle)
        this.planningCamera.dispose()
        this.freeRoam.dispose()
        this.transitionCamera.dispose()
    }
}
