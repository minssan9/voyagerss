import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core'

export type SimPose = 'idle' | 'walk' | 'sit' | 'lie' | 'use'

/**
 * A procedurally built Sim: jointed legs/arms (pivoting at hip/shoulder so
 * a walk cycle is just two sine waves), a head with hair, a green plumbob
 * that spins over the head and shifts green→yellow→red with mood, and a
 * billboard thought bubble for when a need gets urgent.
 */
export class SimCharacter {
    readonly root: TransformNode
    private body: TransformNode
    private hips: TransformNode[] = []
    private shoulders: TransformNode[] = []
    private plumbob: Mesh
    private plumbobMat: StandardMaterial
    private bubble: Mesh
    private bubbleTex: DynamicTexture
    private bubbleUntil = 0
    private phase = 0
    private pose: SimPose = 'idle'

    constructor(private scene: Scene, shirt = new Color3(0.85, 0.55, 0.2)) {
        this.root = new TransformNode('sim-root', scene)
        this.body = new TransformNode('sim-body', scene)
        this.body.parent = this.root

        const skin = this.mat('sim-skin', new Color3(0.93, 0.76, 0.62))
        const pants = this.mat('sim-pants', new Color3(0.22, 0.26, 0.38))
        const shirtMat = this.mat('sim-shirt', shirt)
        const hair = this.mat('sim-hair', new Color3(0.25, 0.16, 0.1))
        const shoe = this.mat('sim-shoe', new Color3(0.12, 0.1, 0.1))

        for (const side of [-1, 1]) {
            const hip = new TransformNode(`sim-hip-${side}`, scene)
            hip.parent = this.body
            hip.position.set(side * 0.09, 0.78, 0)
            const leg = MeshBuilder.CreateBox(`sim-leg-${side}`, { width: 0.13, height: 0.74, depth: 0.14 }, scene)
            leg.material = pants
            leg.parent = hip
            leg.position.y = -0.37
            const foot = MeshBuilder.CreateBox(`sim-foot-${side}`, { width: 0.13, height: 0.07, depth: 0.22 }, scene)
            foot.material = shoe
            foot.parent = hip
            foot.position.set(0, -0.75, 0.04)
            this.hips.push(hip)
        }

        const torso = MeshBuilder.CreateBox('sim-torso', { width: 0.38, height: 0.5, depth: 0.22 }, scene)
        torso.material = shirtMat
        torso.parent = this.body
        torso.position.y = 1.03

        for (const side of [-1, 1]) {
            const shoulder = new TransformNode(`sim-shoulder-${side}`, scene)
            shoulder.parent = this.body
            shoulder.position.set(side * 0.24, 1.24, 0)
            const arm = MeshBuilder.CreateBox(`sim-arm-${side}`, { width: 0.1, height: 0.46, depth: 0.11 }, scene)
            arm.material = shirtMat
            arm.parent = shoulder
            arm.position.y = -0.21
            const hand = MeshBuilder.CreateSphere(`sim-hand-${side}`, { diameter: 0.1, segments: 6 }, scene)
            hand.material = skin
            hand.parent = shoulder
            hand.position.y = -0.47
            this.shoulders.push(shoulder)
        }

        const neck = MeshBuilder.CreateCylinder('sim-neck', { diameter: 0.1, height: 0.08, tessellation: 8 }, scene)
        neck.material = skin
        neck.parent = this.body
        neck.position.y = 1.31

        const head = MeshBuilder.CreateSphere('sim-head', { diameter: 0.28, segments: 12 }, scene)
        head.material = skin
        head.parent = this.body
        head.position.y = 1.47
        head.scaling.y = 1.1

        const hairCap = MeshBuilder.CreateSphere('sim-hair', { diameter: 0.3, segments: 12, slice: 0.55 }, scene)
        hairCap.material = hair
        hairCap.parent = this.body
        hairCap.position.set(0, 1.5, -0.01)

        const eyeMat = this.mat('sim-eye', new Color3(0.1, 0.1, 0.12))
        for (const side of [-1, 1]) {
            const eye = MeshBuilder.CreateSphere(`sim-eye-${side}`, { diameter: 0.035, segments: 6 }, scene)
            eye.material = eyeMat
            eye.parent = this.body
            eye.position.set(side * 0.055, 1.49, 0.13)
        }

        // The plumbob: a stretched octahedron, emissive so it reads at any zoom.
        this.plumbob = MeshBuilder.CreatePolyhedron('sim-plumbob', { type: 1, size: 0.09 }, scene)
        this.plumbob.scaling.set(1, 1.9, 1)
        this.plumbobMat = new StandardMaterial('sim-plumbob-mat', scene)
        this.plumbobMat.diffuseColor = new Color3(0.2, 0.95, 0.3)
        this.plumbobMat.emissiveColor = new Color3(0.1, 0.7, 0.2)
        this.plumbobMat.alpha = 0.92
        this.plumbob.material = this.plumbobMat
        this.plumbob.parent = this.root
        this.plumbob.position.y = 2.05

        this.bubbleTex = new DynamicTexture('sim-bubble-tex', { width: 256, height: 128 }, scene, false)
        this.bubbleTex.hasAlpha = true
        const bubbleMat = new StandardMaterial('sim-bubble-mat', scene)
        bubbleMat.diffuseTexture = this.bubbleTex
        bubbleMat.useAlphaFromDiffuseTexture = true
        bubbleMat.emissiveColor = new Color3(1, 1, 1)
        bubbleMat.disableLighting = true
        bubbleMat.backFaceCulling = false
        this.bubble = MeshBuilder.CreatePlane('sim-bubble', { width: 1.2, height: 0.6 }, scene)
        this.bubble.material = bubbleMat
        this.bubble.parent = this.root
        this.bubble.position.set(0.55, 2.55, 0)
        this.bubble.billboardMode = Mesh.BILLBOARDMODE_ALL
        this.bubble.setEnabled(false)

        for (const mesh of this.root.getChildMeshes()) mesh.isPickable = false
    }

    private mat(name: string, color: Color3): StandardMaterial {
        const m = new StandardMaterial(name, this.scene)
        m.diffuseColor = color
        m.specularColor = new Color3(0.05, 0.05, 0.05)
        return m
    }

    setPose(pose: SimPose) {
        if (pose === this.pose) return
        this.pose = pose
        this.body.rotation.x = 0
        this.body.position.set(0, 0, 0)
        for (const hip of this.hips) hip.rotation.x = 0
        for (const s of this.shoulders) s.rotation.x = 0
        if (pose === 'sit') {
            for (const hip of this.hips) hip.rotation.x = -Math.PI / 2
            this.body.position.set(0, -0.36, -0.1)
            for (const s of this.shoulders) s.rotation.x = -0.4
        } else if (pose === 'lie') {
            // Rotating -90° about X lays the body along local -z (head toward a bed's headboard);
            // shift it forward so feet land at the foot of the bed and the head on the pillow.
            this.body.rotation.x = -Math.PI / 2
            this.body.position.set(0, 0.12, 0.72)
        }
    }

    getPose(): SimPose {
        return this.pose
    }

    setPlumbobVisible(visible: boolean) {
        this.plumbob.setEnabled(visible)
    }

    setVisible(visible: boolean) {
        this.root.setEnabled(visible)
    }

    /** Mood 0..1 → plumbob red..yellow..green, like the real thing. */
    setMood(mood: number) {
        const m = Math.max(0, Math.min(1, mood))
        const color = m > 0.5 ? Color3.Lerp(new Color3(0.95, 0.85, 0.15), new Color3(0.2, 0.95, 0.3), (m - 0.5) * 2) : Color3.Lerp(new Color3(0.95, 0.2, 0.15), new Color3(0.95, 0.85, 0.15), m * 2)
        this.plumbobMat.diffuseColor = color
        this.plumbobMat.emissiveColor = color.scale(0.75)
    }

    think(text: string, nowMs: number, durationMs = 3500) {
        const ctx = this.bubbleTex.getContext() as CanvasRenderingContext2D
        ctx.clearRect(0, 0, 256, 128)
        ctx.fillStyle = 'rgba(255,255,255,0.96)'
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(128, 54, 118, 46, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(46, 108, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#1d1d1f'
        ctx.font = 'bold 34px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 128, 56)
        this.bubbleTex.update(false)
        this.bubble.setEnabled(true)
        this.bubbleUntil = nowMs + durationMs
    }

    /** Per-frame animation: walk cycle, idle breathing, plumbob spin/bob, bubble timeout. */
    animate(dtSec: number, nowMs: number, moving: boolean, strideRate = 9) {
        this.phase += dtSec * (moving ? strideRate : 2)
        if (this.pose === 'walk' || moving) {
            const swing = Math.sin(this.phase) * 0.55
            this.hips[0].rotation.x = swing
            this.hips[1].rotation.x = -swing
            this.shoulders[0].rotation.x = -swing * 0.8
            this.shoulders[1].rotation.x = swing * 0.8
            this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.03
        } else if (this.pose === 'use') {
            this.shoulders[0].rotation.x = -0.9 + Math.sin(this.phase * 2) * 0.15
            this.shoulders[1].rotation.x = -0.9 - Math.sin(this.phase * 2) * 0.15
        } else if (this.pose === 'idle') {
            for (const hip of this.hips) hip.rotation.x = 0
            for (const s of this.shoulders) s.rotation.x = Math.sin(this.phase) * 0.04
            this.body.position.y = Math.sin(this.phase) * 0.006
        }
        this.plumbob.rotation.y += dtSec * 1.6
        this.plumbob.position.y = (this.pose === 'lie' ? 1.2 : this.pose === 'sit' ? 1.7 : 2.05) + Math.sin(nowMs / 400) * 0.04
        if (this.bubble.isEnabled() && nowMs > this.bubbleUntil) this.bubble.setEnabled(false)
    }

    dispose() {
        this.root.dispose(false, true)
    }
}
