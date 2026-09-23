<script setup lang="ts">
import { computed } from 'vue'
import { useCityGameStore } from '../store/store_citygame'
import { TOOL_COST } from '../config/economy'
import CityStatusPanel from './CityStatusPanel.vue'
import type { BuildTool } from '../types'

defineProps<{ ownerName: string }>()
const emit = defineEmits<{
    (event: 'claim-tile'): void
    (event: 'purchase-tile'): void
    (event: 'enter-home'): void
    (event: 'toggle-camera'): void
}>()

const store = useCityGameStore()

interface ToolDef {
    id: BuildTool
    label: string
    hint: string
    accent: string
}

/** Accent per tool — matches the in-world placement-preview ghost color so the toolbar and the 3D hover cue read as one system. */
const toolGroups: ToolDef[][] = [
    [{ id: 'select', label: '1', hint: '선택', accent: '#8e8e93' }],
    [
        { id: 'zone-residential', label: '2', hint: '주거', accent: '#59d973' },
        { id: 'zone-commercial', label: '3', hint: '상업', accent: '#4d8cf2' },
        { id: 'zone-industrial', label: '4', hint: '공업', accent: '#f29940' },
        { id: 'road', label: '5', hint: '도로', accent: '#bfbfc7' },
    ],
    [{ id: 'home', label: '6', hint: '내 집', accent: '#f9c75a' }],
    [
        { id: 'facility-park', label: '7', hint: '공원', accent: '#4cbf59' },
        { id: 'facility-hospital', label: '8', hint: '병원', accent: '#f25a66' },
        { id: 'facility-police', label: '9', hint: '경찰서', accent: '#4d73d9' },
        { id: 'facility-school', label: '0', hint: '학교', accent: '#d9804d' },
        { id: 'facility-landmark', label: 'L', hint: '랜드마크', accent: '#a673f2' },
    ],
    [{ id: 'bulldoze', label: 'Del', hint: '철거', accent: '#f24040' }],
]

const backendLabel = computed(() => (store.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2.0'))
const cameraLabel = computed(() => (store.cameraMode === 'planning' ? '도시 설계' : '자유 탐험'))

const money = (value: number) => Math.round(value).toLocaleString()
const monthlyNet = computed(() => (store.account ? store.account.lastIncome - store.account.lastUpkeep : 0))

function costLabel(tool: BuildTool): string {
    return TOOL_COST[tool] > 0 ? `$${TOOL_COST[tool].toLocaleString()}` : ''
}
</script>

<template>
    <div class="hud">
        <div class="hud-row top-row">
            <div class="left-stack">
                <div class="hud-panel status-panel">
                    <span class="status-dot" :class="{ ready: store.isEngineReady }" />
                    <span class="status-text">{{ backendLabel }}</span>
                    <span class="divider" />
                    <span class="status-text">{{ Math.round(store.fps) }} FPS</span>
                </div>
                <div class="hud-panel budget-panel">
                    <div class="budget-row">
                        <span class="budget-label">시 예산</span>
                        <span class="budget-value treasury">${{ money(store.treasury) }}</span>
                    </div>
                    <div class="budget-row sub">
                        <span>월 세수 +${{ money(store.account?.lastIncome ?? 0) }}</span>
                        <span>유지비 −${{ money(store.account?.lastUpkeep ?? 0) }}</span>
                        <span :class="monthlyNet >= 0 ? 'pos' : 'neg'">{{ monthlyNet >= 0 ? '+' : '−' }}${{ money(Math.abs(monthlyNet)) }}/월</span>
                    </div>
                    <div v-if="store.account && store.account.unfundedFacilities > 0" class="budget-warning">
                        예산 부족 — 시설 {{ store.account.unfundedFacilities }}곳 운영 중단
                    </div>
                    <div class="budget-row household">
                        <span class="budget-label">가계 자금</span>
                        <span class="budget-value">§{{ money(store.household) }}</span>
                    </div>
                </div>
            </div>
            <CityStatusPanel
                :owner-name="ownerName"
                @claim="emit('claim-tile')"
                @purchase="emit('purchase-tile')"
                @enter-home="emit('enter-home')"
            />
        </div>

        <div class="hud-row bottom-row">
            <div class="hud-panel view-toggle">
                <span class="status-text">{{ cameraLabel }}</span>
                <button class="pill-btn" @click="emit('toggle-camera')">Tab ⇄</button>
            </div>

            <div v-if="store.cameraMode === 'planning'" class="hud-panel toolbar">
                <template v-for="(group, gi) in toolGroups" :key="gi">
                    <span v-if="gi > 0" class="tool-divider" />
                    <button
                        v-for="tool in group"
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
                </template>
            </div>

            <div class="bottom-spacer" />
        </div>

        <transition name="notice">
            <div v-if="store.lastNotice" :key="store.lastNotice.at" class="notice">{{ store.lastNotice.text }}</div>
        </transition>
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

.left-stack {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
}

.budget-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    min-width: 250px;
}

.budget-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
}

.budget-row.sub {
    font-size: 11px;
    color: #6e6e73;
    font-variant-numeric: tabular-nums;
}

.budget-row.household {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.budget-label {
    font-size: 12px;
    font-weight: 600;
    color: #6e6e73;
}

.budget-value {
    font-size: 16px;
    font-weight: 600;
    color: #1d1d1f;
    font-variant-numeric: tabular-nums;
}

.budget-value.treasury {
    color: #1a7f37;
}

.pos {
    color: #1a7f37;
    font-weight: 600;
}

.neg {
    color: #d70015;
    font-weight: 600;
}

.budget-warning {
    font-size: 11px;
    font-weight: 600;
    color: #d70015;
    background: rgba(255, 59, 48, 0.1);
    border-radius: 8px;
    padding: 4px 8px;
}

.bottom-row {
    align-items: flex-end;
}

.bottom-spacer {
    width: 200px;
}

.toolbar {
    padding: 8px;
    gap: 4px;
}

.tool-divider {
    width: 1px;
    height: 36px;
    margin: 0 4px;
    background: rgba(0, 0, 0, 0.1);
}

.notice {
    position: absolute;
    left: 50%;
    bottom: 110px;
    transform: translateX(-50%);
    background: rgba(29, 29, 31, 0.85);
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 999px;
    pointer-events: none;
}

.notice-enter-active,
.notice-leave-active {
    transition: opacity 0.2s ease;
}
.notice-enter-from,
.notice-leave-to {
    opacity: 0;
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
    width: 200px;
    box-sizing: border-box;
    justify-content: space-between;
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
