<script setup lang="ts">
import { computed } from 'vue'
import { useCityGameStore } from '../store/store_citygame'
import { TOOL_COST } from '../config/economy'
import CityStatusPanel from './CityStatusPanel.vue'
import type { BuildTool } from '../types'

defineProps<{ ownerName: string }>()
const emit = defineEmits<{ (event: 'claim-tile'): void }>()

const store = useCityGameStore()

/** Accent per tool — matches the in-world placement-preview ghost color so the toolbar and the 3D hover cue read as one system. */
const tools: { id: BuildTool; label: string; hint: string; accent: string }[] = [
    { id: 'select', label: '1', hint: '선택', accent: '#8e8e93' },
    { id: 'zone-residential', label: '2', hint: '주거', accent: '#59d973' },
    { id: 'zone-commercial', label: '3', hint: '상업', accent: '#4d8cf2' },
    { id: 'zone-industrial', label: '4', hint: '공업', accent: '#f29940' },
    { id: 'road', label: '5', hint: '도로', accent: '#bfbfc7' },
    { id: 'bulldoze', label: 'Del', hint: '철거', accent: '#f24040' },
]

const backendLabel = computed(() => (store.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2.0'))
const cameraLabel = computed(() => (store.cameraMode === 'planning' ? 'Planning View' : 'Walkthrough View'))
const fundsLabel = computed(() => `$${Math.round(store.funds).toLocaleString()}`)

function costLabel(tool: BuildTool): string {
    return TOOL_COST[tool] > 0 ? `$${TOOL_COST[tool]}` : ''
}
</script>

<template>
    <div class="hud">
        <div class="hud-row top-row">
            <div class="hud-panel status-panel">
                <span class="status-dot" :class="{ ready: store.isEngineReady }" />
                <span class="status-text">{{ backendLabel }}</span>
                <span class="divider" />
                <span class="status-text">{{ Math.round(store.fps) }} FPS</span>
                <span class="divider" />
                <span class="status-text funds">{{ fundsLabel }}</span>
            </div>
            <CityStatusPanel :owner-name="ownerName" @claim="emit('claim-tile')" />
        </div>

        <div class="hud-panel toolbar">
            <button
                v-for="tool in tools"
                :key="tool.id"
                class="tool-btn"
                :class="{ active: store.activeTool === tool.id, unaffordable: !store.canAfford(tool.id) }"
                :style="{ '--accent': tool.accent }"
                :disabled="!store.canAfford(tool.id)"
                @click="store.setActiveTool(tool.id)"
            >
                <span class="tool-swatch" />
                <span class="tool-key">{{ tool.label }}</span>
                <span class="tool-label">{{ tool.hint }}</span>
                <span v-if="costLabel(tool.id)" class="tool-cost">{{ costLabel(tool.id) }}</span>
            </button>
        </div>

        <div class="hud-panel view-toggle">
            <span class="status-text">{{ cameraLabel }}</span>
            <button class="pill-btn" @click="store.setCameraMode(store.cameraMode === 'planning' ? 'walkthrough' : 'planning')">
                Tab ⇄
            </button>
        </div>
    </div>
</template>

<style scoped>
.hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
}

.hud-panel {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    width: fit-content;
}

.hud-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    pointer-events: none;
}

.status-panel {
    align-self: flex-start;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff3b30;
    transition: background 0.3s ease;
}
.status-dot.ready {
    background: #34c759;
}

.status-text {
    font-size: 13px;
    font-weight: 500;
    color: #1d1d1f;
    letter-spacing: 0.2px;
}

.divider {
    width: 1px;
    height: 14px;
    background: rgba(0, 0, 0, 0.12);
}

.funds {
    font-variant-numeric: tabular-nums;
    color: #1a7f37;
}

.toolbar {
    align-self: center;
    padding: 8px;
    gap: 6px;
}

.tool-btn {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 56px;
    height: 52px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #1d1d1f;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
}

.tool-btn:hover {
    background: rgba(0, 0, 0, 0.05);
}

/* A soft tint of the tool's own accent color, plus a solid underline — reads as "selected + this color" without going loud. */
.tool-btn.active {
    background: color-mix(in srgb, var(--accent) 16%, #fff 84%);
}

.tool-btn.active::after {
    content: '';
    position: absolute;
    bottom: 4px;
    width: 20px;
    height: 3px;
    border-radius: 999px;
    background: var(--accent);
}

.tool-swatch {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
}

.tool-key {
    font-size: 13px;
    font-weight: 600;
}

.tool-label {
    font-size: 10px;
    opacity: 0.75;
}

.tool-cost {
    font-size: 9px;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
}

.tool-btn.unaffordable {
    opacity: 0.4;
    cursor: not-allowed;
}

.tool-btn:disabled {
    pointer-events: none;
}

.view-toggle {
    align-self: flex-end;
}

.pill-btn {
    border: none;
    border-radius: 999px;
    background: #1d1d1f;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 14px;
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.pill-btn:hover {
    opacity: 0.85;
}
</style>
