import { ArcRotateCamera, UniversalCamera, Scene, Vector3 } from '@babylonjs/core'
import type { GameAction } from '../config/actions'
import type { CameraMode } from '../types'

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
 * Owns both cameras (top-down isometric planning + ground-level walkthrough)
 * and cross-fades position/target between them with a requestAnimationFrame
 * lerp so switching views never feels like a hard cut.
 */
export class CameraController {
    public mode: CameraMode = 'planning'
    private isTransitioning = false
    private transitionHandle: number | null = null

    private planningCamera: ArcRotateCamera
    private walkCamera: UniversalCamera
    private transitionCamera: UniversalCamera
    private scene: Scene
    private canvas: HTMLCanvasElement

    private readonly panSpeed = 0.6
    private readonly rotateSpeed = 0.022

    constructor(
        scene: Scene,
        canvas: HTMLCanvasElement,
        private onModeChange?: (mode: CameraMode) => void,
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

        this.walkCamera = new UniversalCamera('walkCamera', new Vector3(0, 1.8, -10), scene)
        this.walkCamera.minZ = 0.1
        this.walkCamera.speed = 0.4
        this.walkCamera.angularSensibility = 3200
        this.walkCamera.keysUp.push(87) // W
        this.walkCamera.keysDown.push(83) // S
        this.walkCamera.keysLeft.push(65) // A
        this.walkCamera.keysRight.push(68) // D
        this.walkCamera.applyGravity = true
        this.walkCamera.checkCollisions = true
        this.walkCamera.ellipsoid = new Vector3(0.5, 0.9, 0.5)

        this.transitionCamera = new UniversalCamera('transitionCamera', Vector3.Zero(), scene)

        scene.activeCamera = this.planningCamera
        scene.collisionsEnabled = true
    }

    toggle() {
        this.setMode(this.mode === 'planning' ? 'walkthrough' : 'planning')
    }

    setMode(targetMode: CameraMode) {
        if (targetMode === this.mode || this.isTransitioning) return
        this.isTransitioning = true

        const activeCamera = this.scene.activeCamera as ArcRotateCamera | UniversalCamera
        const fromPos = activeCamera.position.clone()
        const fromTarget = (this.mode === 'planning' ? this.planningCamera.target : this.walkCamera.getTarget()).clone()

        const planningTarget = this.planningCamera.target.clone()
        const toPos =
            targetMode === 'walkthrough'
                ? new Vector3(planningTarget.x, 1.8, planningTarget.z - 6)
                : this.planningCamera.position.clone()
        const toTarget = planningTarget

        this.planningCamera.detachControl()
        this.walkCamera.detachControl()
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
                this.walkCamera.position.copyFrom(toPos)
                this.walkCamera.setTarget(toTarget)
                this.scene.activeCamera = this.walkCamera
                this.walkCamera.attachControl(this.canvas, true)
            } else {
                this.scene.activeCamera = this.planningCamera
                this.planningCamera.attachControl(this.canvas, true)
            }
        }
        this.transitionHandle = requestAnimationFrame(step)
    }

    /** Called once per frame with the set of currently-active actions (from keyboard and/or gamepad). */
    update(activeActions: ReadonlySet<GameAction>, deltaMs: number) {
        if (this.mode !== 'planning' || this.isTransitioning) return
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

    /** Current planning-camera orbit target, in world meters — used to resolve which map tile is under view. */
    getPlanningTarget(): Vector3 {
        return this.planningCamera.target
    }

    /** Current planning-camera orbit radius, in meters — the camera-distance signal for tile streaming. */
    getPlanningRadius(): number {
        return this.planningCamera.radius
    }

    dispose() {
        if (this.transitionHandle !== null) cancelAnimationFrame(this.transitionHandle)
        this.planningCamera.dispose()
        this.walkCamera.dispose()
        this.transitionCamera.dispose()
    }
}
