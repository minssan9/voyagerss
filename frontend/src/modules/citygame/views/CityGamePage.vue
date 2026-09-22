<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { GameEngine } from '../engine/GameEngine'
import { CameraController } from '../engine/CameraController'
import { useCityGameStore } from '../store/store_citygame'
import { useKeyboardControls } from '../composables/useKeyboardControls'
import { BULLDOZE_KEY, TOGGLE_CAMERA_KEY, TOGGLE_HINTS_KEY, TOOL_HOTKEYS } from '../config/hotkeys'
import GameHud from '../components/GameHud.vue'
import HotkeyHintOverlay from '../components/HotkeyHintOverlay.vue'

const store = useCityGameStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

let gameEngine: GameEngine | null = null
let cameraController: CameraController | null = null
let lastFrameTime = performance.now()

const { pressedKeys } = useKeyboardControls({
    onKeyDown: (event) => {
        const tool = TOOL_HOTKEYS[event.code]
        if (tool) {
            store.setActiveTool(tool)
            return
        }
        if (event.code === BULLDOZE_KEY) {
            store.setActiveTool('bulldoze')
        } else if (event.code === TOGGLE_CAMERA_KEY) {
            event.preventDefault()
            cameraController?.toggle()
            store.setCameraMode(cameraController?.mode ?? 'planning')
        } else if (event.code === TOGGLE_HINTS_KEY) {
            store.toggleHotkeyHints()
        }
    },
})

onMounted(async () => {
    if (!canvasRef.value) return

    gameEngine = new GameEngine(canvasRef.value)
    const { scene, backend } = await gameEngine.init()
    store.setBackend(backend)
    store.setEngineReady(true)

    cameraController = new CameraController(scene, canvasRef.value)

    lastFrameTime = performance.now()
    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now()
        const deltaMs = now - lastFrameTime
        lastFrameTime = now
        cameraController?.update(pressedKeys, deltaMs)
        store.setFps(gameEngine?.getFps() ?? 0)
    })
})

onBeforeUnmount(() => {
    cameraController?.dispose()
    gameEngine?.dispose()
    store.setEngineReady(false)
})
</script>

<template>
    <div class="citygame-root">
        <canvas ref="canvasRef" class="citygame-canvas" />
        <GameHud />
        <HotkeyHintOverlay />
    </div>
</template>

<style scoped>
.citygame-root {
    position: fixed;
    inset: 0;
    background: #14161a;
    overflow: hidden;
}

.citygame-canvas {
    width: 100%;
    height: 100%;
    display: block;
    outline: none;
    touch-action: none;
}
</style>
