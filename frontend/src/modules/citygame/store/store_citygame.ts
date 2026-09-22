import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BuildTool, CameraMode, RendererBackend } from '../types'

export const useCityGameStore = defineStore('citygame', () => {
    const backend = ref<RendererBackend>('webgl2')
    const cameraMode = ref<CameraMode>('planning')
    const activeTool = ref<BuildTool>('select')
    const showHotkeyHints = ref(true)
    const fps = ref(0)
    const isEngineReady = ref(false)

    function setBackend(value: RendererBackend) {
        backend.value = value
    }

    function setCameraMode(value: CameraMode) {
        cameraMode.value = value
    }

    function setActiveTool(value: BuildTool) {
        activeTool.value = value
    }

    function toggleHotkeyHints() {
        showHotkeyHints.value = !showHotkeyHints.value
    }

    function setFps(value: number) {
        fps.value = value
    }

    function setEngineReady(value: boolean) {
        isEngineReady.value = value
    }

    return {
        backend,
        cameraMode,
        activeTool,
        showHotkeyHints,
        fps,
        isEngineReady,
        setBackend,
        setCameraMode,
        setActiveTool,
        toggleHotkeyHints,
        setFps,
        setEngineReady,
    }
})
