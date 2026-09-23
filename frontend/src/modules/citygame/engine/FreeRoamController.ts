import { AbstractMesh, ArcRotateCamera, Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core'
import type { GameAction } from '../config/actions'
import { SimCharacter } from './interior/SimCharacter'

export interface FreeRoamHooks {
    /** True if a disc of `radius` meters at world (x, z) overlaps a building. */
    isBlocked(x: number, z: number, radius: number): boolean
    /** World position of the local player's front door, if they have a home. */
    homeDoor(): Vector3 | null
    onEnterHome(): void
    onHud(state: FreeRoamHudState): void
    addShadowCaster?(mesh: AbstractMesh): void
}

export interface FreeRoamHudState {
    inCar: boolean
    speedKmh: number
    prompt: string | null
    heading: number
    x: number
    z: number
}

const WALK_SPEED = 4.2
const RUN_SPEED = 8.5
const GRAVITY = -16
const JUMP_VELOCITY = 5.5
const PLAYER_RADIUS = 0.35

const CAR_MAX_SPEED = 26
const CAR_REVERSE_MAX = 8
const CAR_ACCEL = 11
const CAR_BRAKE = 22
const CAR_DRAG = 3.2
const CAR_RADIUS = 1.2
const ENTER_CAR_DISTANCE = 3.2
const ENTER_HOME_DISTANCE = 4.5

function lerpAngle(a: number, b: number, t: number): number {
    let d = (b - a) % (Math.PI * 2)
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    return a + d * t
}

/**
 * GTA-style free roam through the player's city: a third-person avatar with
 * a mouse-orbit follow camera (WASD camera-relative, Shift to run, Space to
 * jump), buildings as solid obstacles, a car you can get into with F and
 * drive with arcade handling, and E at your own front door to go inside.
 */
export class FreeRoamController {
    readonly camera: ArcRotateCamera
    private player: SimCharacter
    private car: TransformNode
    private wheels: Mesh[] = []
    private keys = new Set<string>()
    private pressed = new Set<string>()
    private enabled = false

    private playerPos = new Vector3()
    private playerVy = 0
    private playerHeading = 0

    private carPos = new Vector3()
    private carHeading = 0
    private carSpeed = 0
    private inCar = false
    private hudTimer = 0

    constructor(
        private scene: Scene,
        private canvas: HTMLCanvasElement,
        private hooks: FreeRoamHooks,
    ) {
        this.camera = new ArcRotateCamera('freeRoamCamera', -Math.PI / 2, 1.2, 7, Vector3.Zero(), scene)
        this.camera.minZ = 0.1
        this.camera.lowerRadiusLimit = 3
        this.camera.upperRadiusLimit = 18
        this.camera.lowerBetaLimit = 0.35
        this.camera.upperBetaLimit = Math.PI / 2.05
        this.camera.wheelPrecision = 30
        this.camera.angularSensibilityX = 900
        this.camera.angularSensibilityY = 900
        // Keyboard drives the avatar, not the camera; right-drag panning would detach the camera from the player.
        this.camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput')
        this.camera.panningSensibility = 0

        this.player = new SimCharacter(scene, new Color3(0.2, 0.45, 0.85))
        this.player.setPlumbobVisible(false)
        this.player.setVisible(false)
        this.car = this.buildCar()
        this.car.setEnabled(false)
        for (const mesh of [...this.player.root.getChildMeshes(), ...this.car.getChildMeshes()]) {
            mesh.isPickable = false
            hooks.addShadowCaster?.(mesh)
        }
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (!this.enabled) return
        if (!this.keys.has(e.code)) this.pressed.add(e.code)
        this.keys.add(e.code)
        if (e.code === 'Space') e.preventDefault()
    }

    private onKeyUp = (e: KeyboardEvent) => {
        this.keys.delete(e.code)
    }

    /** Drops the avatar at `spawn` (with its car parked alongside) and hands it the camera. */
    enable(spawn: Vector3, facing = 0) {
        this.enabled = true
        this.inCar = false
        this.playerPos.copyFrom(spawn)
        this.playerPos.y = 0
        this.playerHeading = facing
        this.carSpeed = 0
        // Parked nose-out: facing away from where the avatar looks (its home), so W drives onto the street.
        this.carHeading = facing + Math.PI
        const right = new Vector3(Math.cos(facing), 0, -Math.sin(facing))
        this.carPos.copyFrom(this.findFreeSpot(spawn.add(right.scale(3)), CAR_RADIUS))
        this.player.setVisible(true)
        this.car.setEnabled(true)
        this.camera.alpha = -Math.PI / 2 - facing
        this.camera.beta = 1.2
        this.camera.radius = 7
        this.syncTransforms()
        this.camera.target.copyFrom(this.focusPoint())
        this.scene.activeCamera = this.camera
        this.camera.attachControl(this.canvas, true)
        window.addEventListener('keydown', this.onKeyDown)
        window.addEventListener('keyup', this.onKeyUp)
    }

    disable() {
        this.enabled = false
        this.camera.detachControl()
        this.player.setVisible(false)
        this.car.setEnabled(false)
        this.keys.clear()
        this.pressed.clear()
        window.removeEventListener('keydown', this.onKeyDown)
        window.removeEventListener('keyup', this.onKeyUp)
        this.hooks.onHud({ inCar: false, speedKmh: 0, prompt: null, heading: 0, x: 0, z: 0 })
    }

    /** Forget held/pressed keys — e.g. an F pressed inside the house shouldn't toggle the car on the way out. */
    clearInput() {
        this.keys.clear()
        this.pressed.clear()
    }

    isEnabled(): boolean {
        return this.enabled
    }

    isInCar(): boolean {
        return this.inCar
    }

    /** Where tile streaming should center while roaming. */
    focusPoint(): Vector3 {
        return (this.inCar ? this.carPos : this.playerPos).clone()
    }

    getPlayerPosition(): Vector3 {
        return this.playerPos.clone()
    }

    getCarPosition(): Vector3 {
        return this.carPos.clone()
    }

    /** Per frame. `actions` carries WASD (and gamepad stick) as pan-* actions; run/jump/F/E come from raw keys. */
    update(actions: ReadonlySet<GameAction>, dtSec: number) {
        if (!this.enabled) return
        const dt = Math.min(dtSec, 0.05)
        const forwardIn = (actions.has('pan-forward') ? 1 : 0) - (actions.has('pan-back') ? 1 : 0)
        const strafeIn = (actions.has('pan-right') ? 1 : 0) - (actions.has('pan-left') ? 1 : 0)

        let prompt: string | null = null
        const home = this.hooks.homeDoor()
        const nearHome = !!home && Vector3.Distance(this.focusPoint(), home) < ENTER_HOME_DISTANCE + (this.inCar ? 2 : 0)

        if (this.pressed.has('KeyF')) this.toggleCar()
        if (this.pressed.has('KeyE') && nearHome && !this.inCar) {
            this.pressed.clear()
            this.hooks.onEnterHome()
            return
        }
        this.pressed.clear()

        if (this.inCar) {
            this.updateCar(dt, forwardIn, strafeIn)
            prompt = nearHome ? 'F 내리기 · 집 앞에서 내린 뒤 E' : 'F 내리기'
        } else {
            this.updateOnFoot(dt, forwardIn, strafeIn)
            if (nearHome) prompt = 'E 집 들어가기'
            else if (Vector3.Distance(this.playerPos, this.carPos) < ENTER_CAR_DISTANCE) prompt = 'F 차에 타기'
        }

        this.syncTransforms()
        this.updateCamera(dt)

        this.hudTimer -= dt
        if (this.hudTimer <= 0) {
            this.hudTimer = 0.1
            const pos = this.focusPoint()
            this.hooks.onHud({
                inCar: this.inCar,
                speedKmh: Math.round(Math.abs(this.carSpeed) * 3.6),
                prompt,
                heading: this.inCar ? this.carHeading : this.playerHeading,
                x: pos.x,
                z: pos.z,
            })
        }
    }

    private updateOnFoot(dt: number, forwardIn: number, strafeIn: number) {
        const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
        // Camera-relative: "forward" is where the camera looks, flattened onto the ground.
        const camForward = new Vector3(-Math.cos(this.camera.alpha), 0, -Math.sin(this.camera.alpha))
        const camRight = new Vector3(camForward.z, 0, -camForward.x)
        const dir = camForward.scale(forwardIn).add(camRight.scale(strafeIn))
        const moving = dir.lengthSquared() > 0
        if (moving) {
            dir.normalize()
            const step = dir.scale((run ? RUN_SPEED : WALK_SPEED) * dt)
            this.moveWithCollision(this.playerPos, step, PLAYER_RADIUS)
            this.playerHeading = lerpAngle(this.playerHeading, Math.atan2(dir.x, dir.z), Math.min(1, dt * 14))
        }

        const grounded = this.playerPos.y <= 0.001
        if (grounded && this.keys.has('Space')) this.playerVy = JUMP_VELOCITY
        this.playerVy += GRAVITY * dt
        this.playerPos.y = Math.max(0, this.playerPos.y + this.playerVy * dt)
        if (this.playerPos.y === 0 && this.playerVy < 0) this.playerVy = 0

        this.player.setPose(moving ? 'walk' : 'idle')
        this.player.animate(dt, performance.now(), moving, run ? 14 : 9)
    }

    private updateCar(dt: number, throttle: number, steer: number) {
        const handbrake = this.keys.has('Space')
        if (throttle > 0) {
            this.carSpeed += (this.carSpeed < 0 ? CAR_BRAKE : CAR_ACCEL) * dt
        } else if (throttle < 0) {
            this.carSpeed -= (this.carSpeed > 0 ? CAR_BRAKE : CAR_ACCEL * 0.6) * dt
        } else {
            const drag = CAR_DRAG * dt
            this.carSpeed = Math.abs(this.carSpeed) <= drag ? 0 : this.carSpeed - Math.sign(this.carSpeed) * drag
        }
        if (handbrake) this.carSpeed *= Math.max(0, 1 - dt * 3)
        this.carSpeed = Math.max(-CAR_REVERSE_MAX, Math.min(CAR_MAX_SPEED, this.carSpeed))

        // Steering authority grows with speed then eases off, and flips in reverse like a real car.
        const grip = Math.min(1, Math.abs(this.carSpeed) / 6) * (1 - Math.min(0.55, Math.abs(this.carSpeed) / CAR_MAX_SPEED * 0.55))
        this.carHeading += steer * grip * Math.sign(this.carSpeed || 1) * dt * (handbrake ? 3.4 : 2.2)

        const forward = new Vector3(Math.sin(this.carHeading), 0, Math.cos(this.carHeading))
        const step = forward.scale(this.carSpeed * dt)
        if (!this.moveWithCollision(this.carPos, step, CAR_RADIUS)) {
            // Crunch: lose most of the speed and bounce back a little.
            this.carSpeed = -this.carSpeed * 0.25
        }
        for (const wheel of this.wheels) wheel.rotation.y += (this.carSpeed * dt) / 0.35
    }

    /** Moves `pos` by `step`, sliding along whichever axis is free. Returns false if the full move was blocked. */
    private moveWithCollision(pos: Vector3, step: Vector3, radius: number): boolean {
        const nx = pos.x + step.x
        const nz = pos.z + step.z
        if (!this.hooks.isBlocked(nx, nz, radius)) {
            pos.x = nx
            pos.z = nz
            return true
        }
        if (!this.hooks.isBlocked(nx, pos.z, radius)) pos.x = nx
        else if (!this.hooks.isBlocked(pos.x, nz, radius)) pos.z = nz
        return false
    }

    private toggleCar() {
        if (this.inCar) {
            if (Math.abs(this.carSpeed) > 3) return
            this.inCar = false
            this.carSpeed = 0
            const left = new Vector3(-Math.cos(this.carHeading), 0, Math.sin(this.carHeading))
            this.playerPos.copyFrom(this.findFreeSpot(this.carPos.add(left.scale(1.8)), PLAYER_RADIUS))
            this.playerHeading = this.carHeading
            this.player.setVisible(true)
        } else if (Vector3.Distance(this.playerPos, this.carPos) < ENTER_CAR_DISTANCE) {
            this.inCar = true
            this.player.setVisible(false)
        }
    }

    private findFreeSpot(preferred: Vector3, radius: number): Vector3 {
        for (let ring = 0; ring < 8; ring++) {
            for (let k = 0; k < 8; k++) {
                const a = (k / 8) * Math.PI * 2
                const p = new Vector3(preferred.x + Math.cos(a) * ring * 1.5, 0, preferred.z + Math.sin(a) * ring * 1.5)
                if (!this.hooks.isBlocked(p.x, p.z, radius)) return p
                if (ring === 0) break
            }
        }
        return preferred.clone()
    }

    private syncTransforms() {
        this.player.root.position.copyFrom(this.playerPos)
        this.player.root.rotation.y = this.playerHeading
        this.car.position.set(this.carPos.x, 0, this.carPos.z)
        this.car.rotation.y = this.carHeading
    }

    private updateCamera(dt: number) {
        const focus = this.focusPoint()
        focus.y += this.inCar ? 1.2 : 1.35
        Vector3.LerpToRef(this.camera.target, focus, Math.min(1, dt * 10), this.camera.target)
        if (this.inCar) {
            // Swing in behind the car as it drives, like a chase cam — still orbitable with the mouse when parked.
            if (Math.abs(this.carSpeed) > 1) this.camera.alpha = lerpAngle(this.camera.alpha, -Math.PI / 2 - this.carHeading, Math.min(1, dt * 2.5))
            this.camera.radius += (Math.max(this.camera.radius, 9) - this.camera.radius) * Math.min(1, dt * 2)
        }
    }

    private buildCar(): TransformNode {
        const root = new TransformNode('player-car', this.scene)
        const mat = (name: string, c: Color3, emissive = 0) => {
            const m = new StandardMaterial(`player-car-${name}`, this.scene)
            m.diffuseColor = c
            m.specularColor = new Color3(0.4, 0.4, 0.4)
            if (emissive) m.emissiveColor = c.scale(emissive)
            return m
        }
        const paint = mat('paint', new Color3(0.85, 0.12, 0.12))
        const glass = mat('glass', new Color3(0.15, 0.2, 0.28))
        const tire = mat('tire', new Color3(0.08, 0.08, 0.08))
        const rim = mat('rim', new Color3(0.75, 0.75, 0.78))
        const head = mat('head', new Color3(1, 0.96, 0.8), 0.9)
        const tail = mat('tail', new Color3(0.9, 0.1, 0.1), 0.8)
        const part = (mesh: Mesh, m: StandardMaterial, x: number, y: number, z: number) => {
            mesh.material = m
            mesh.parent = root
            mesh.position.set(x, y, z)
            return mesh
        }
        part(MeshBuilder.CreateBox('car-body', { width: 1.8, height: 0.55, depth: 4.2 }, this.scene), paint, 0, 0.62, 0)
        part(MeshBuilder.CreateBox('car-cabin', { width: 1.6, height: 0.5, depth: 2.1 }, this.scene), glass, 0, 1.13, -0.2)
        part(MeshBuilder.CreateBox('car-roof', { width: 1.62, height: 0.06, depth: 1.8 }, this.scene), paint, 0, 1.4, -0.25)
        for (const x of [-0.6, 0.6]) {
            part(MeshBuilder.CreateBox('car-headlight', { width: 0.4, height: 0.14, depth: 0.05 }, this.scene), head, x, 0.7, 2.11)
            part(MeshBuilder.CreateBox('car-taillight', { width: 0.4, height: 0.12, depth: 0.05 }, this.scene), tail, x, 0.72, -2.11)
        }
        for (const [x, z] of [
            [-0.88, 1.35],
            [0.88, 1.35],
            [-0.88, -1.35],
            [0.88, -1.35],
        ]) {
            const hub = new TransformNode('car-wheel-hub', this.scene)
            hub.parent = root
            hub.position.set(x, 0.35, z)
            hub.rotation.z = Math.PI / 2
            const wheel = MeshBuilder.CreateCylinder('car-wheel', { diameter: 0.7, height: 0.28, tessellation: 16 }, this.scene)
            wheel.material = tire
            wheel.parent = hub
            const cap = MeshBuilder.CreateCylinder('car-rim', { diameter: 0.38, height: 0.3, tessellation: 12 }, this.scene)
            cap.material = rim
            cap.parent = wheel
            // The hub turns the cylinder's Y axis onto the axle, so rolling is rotation about the wheel's own Y.
            this.wheels.push(wheel)
        }
        return root
    }

    dispose() {
        this.disable()
        this.player.dispose()
        this.car.dispose(false, true)
        this.camera.dispose()
    }
}
