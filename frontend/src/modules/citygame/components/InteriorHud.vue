<script setup lang="ts">
import { computed, ref } from 'vue'
import { CATEGORY_LABELS, FURNITURE, NEED_KEYS, NEED_LABELS, type FurnitureCategory } from '../engine/interior/catalog'
import type { GameSpeed, InteriorMode, InteriorSnapshot } from '../engine/interior/InteriorScene'

const props = defineProps<{ snapshot: InteriorSnapshot | null; household: number; simName: string }>()
const emit = defineEmits<{
    (e: 'mode', mode: InteriorMode): void
    (e: 'select', itemId: string | null): void
    (e: 'rotate'): void
    (e: 'speed', speed: GameSpeed): void
    (e: 'exit'): void
}>()

const categories = Object.keys(CATEGORY_LABELS) as FurnitureCategory[]
const activeCategory = ref<FurnitureCategory>('seating')
const items = computed(() => FURNITURE.filter((f) => f.category === activeCategory.value))

const clockLabel = computed(() => {
    const c = props.snapshot?.clock
    if (!c) return ''
    const h12 = c.hour % 12 === 0 ? 12 : c.hour % 12
    return `${c.day}일차 · ${c.hour < 12 ? '오전' : '오후'} ${h12}:${String(c.minute).padStart(2, '0')}`
})

const plumbobColor = computed(() => {
    const m = props.snapshot?.mood ?? 1
    if (m > 0.66) return '#34c759'
    if (m > 0.4) return '#ffcc00'
    return '#ff3b30'
})

function needColor(value: number): string {
    if (value > 60) return '#34c759'
    if (value > 30) return '#ffcc00'
    return '#ff3b30'
}

const speedLabels: Record<GameSpeed, string> = { 0: '❚❚', 1: '▶', 2: '▶▶', 3: '▶▶▶' }
</script>

<template>
    <div class="ihud">
        <div class="ihud-top">
            <div class="ihud-panel facilities">
                <div class="panel-title">우리 동네 시설</div>
                <div v-if="!snapshot?.facilities.length" class="muted">반경 안에 시설이 없어요 — 도시에서 공원·병원 등을 지으면 이 집에 효과가 생깁니다.</div>
                <div v-for="f in snapshot?.facilities ?? []" :key="f.tool + f.distance" class="facility-row">
                    <span class="facility-dot" :class="{ off: !f.funded }" />
                    <span class="facility-name">{{ f.label }}</span>
                    <span class="facility-dist">{{ f.distance }}m</span>
                    <span class="facility-effect" :class="{ off: !f.funded }">{{ f.funded ? f.description : '운영 중단 (시 예산 부족)' }}</span>
                </div>
            </div>
            <button class="exit-btn" @click="emit('exit')">도시로 나가기 (Esc)</button>
        </div>

        <div v-if="snapshot?.mode === 'buy'" class="ihud-panel catalog">
            <div class="catalog-tabs">
                <button v-for="c in categories" :key="c" class="tab" :class="{ active: c === activeCategory }" @click="activeCategory = c">
                    {{ CATEGORY_LABELS[c] }}
                </button>
                <span class="catalog-hint">R 회전 · 우클릭 취소</span>
            </div>
            <div class="catalog-items">
                <button
                    v-for="item in items"
                    :key="item.id"
                    class="item"
                    :class="{ selected: snapshot?.selectedItem === item.id, poor: household < item.price }"
                    :disabled="household < item.price"
                    @click="emit('select', snapshot?.selectedItem === item.id ? null : item.id)"
                >
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-price">§{{ item.price.toLocaleString() }}</span>
                    <span class="item-meta">
                        <template v-for="(v, k) in item.satisfies" :key="k">{{ NEED_LABELS[k] }}+ </template>
                        <template v-if="item.decor >= 5">환경+{{ item.decor }}</template>
                    </span>
                </button>
            </div>
        </div>

        <div class="ihud-panel bottom">
            <div class="modes">
                <button class="mode" :class="{ active: snapshot?.mode === 'live' }" @click="emit('mode', 'live')">생활<small>L</small></button>
                <button class="mode" :class="{ active: snapshot?.mode === 'buy' }" @click="emit('mode', 'buy')">구매<small>B</small></button>
                <button class="mode" :class="{ active: snapshot?.mode === 'sell' }" @click="emit('mode', 'sell')">판매<small>Del</small></button>
            </div>

            <div class="time">
                <div class="clock">{{ clockLabel }}</div>
                <div class="speeds">
                    <button
                        v-for="s in [0, 1, 2, 3] as GameSpeed[]"
                        :key="s"
                        class="speed"
                        :class="{ active: snapshot?.speed === s }"
                        @click="emit('speed', s)"
                    >
                        {{ speedLabels[s] }}
                    </button>
                </div>
                <div class="money">§{{ Math.round(household).toLocaleString() }}</div>
            </div>

            <div class="sim">
                <div class="plumbob" :style="{ background: plumbobColor }" />
                <div class="sim-text">
                    <div class="sim-name">{{ simName }}</div>
                    <div class="sim-action">{{ snapshot?.action }}</div>
                </div>
            </div>

            <div class="needs">
                <div v-for="k in NEED_KEYS" :key="k" class="need">
                    <span class="need-label">{{ NEED_LABELS[k] }}</span>
                    <span class="need-bar">
                        <span class="need-fill" :style="{ width: `${snapshot?.needs[k] ?? 0}%`, background: needColor(snapshot?.needs[k] ?? 0) }" />
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ihud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Apple SD Gothic Neo', 'Segoe UI', system-ui, sans-serif;
    color: #1d1d1f;
}

.ihud-panel {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
    padding: 12px 16px;
}

.ihud-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.panel-title {
    font-size: 12px;
    font-weight: 700;
    color: #6e6e73;
    margin-bottom: 6px;
}

.facilities {
    max-width: 440px;
}

.muted {
    font-size: 12px;
    color: #6e6e73;
}

.facility-row {
    display: grid;
    grid-template-columns: 10px 64px 48px 1fr;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 2px 0;
}

.facility-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #34c759;
}
.facility-dot.off {
    background: #ff3b30;
}

.facility-name {
    font-weight: 600;
}

.facility-dist {
    color: #6e6e73;
    font-variant-numeric: tabular-nums;
}

.facility-effect.off {
    color: #d70015;
    font-weight: 600;
}

.exit-btn {
    pointer-events: auto;
    border: none;
    border-radius: 999px;
    background: #1d1d1f;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 10px 18px;
    cursor: pointer;
}

.catalog {
    align-self: center;
    margin-top: auto;
    margin-bottom: 10px;
    max-width: 920px;
}

.catalog-tabs {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 10px;
}

.tab {
    border: none;
    background: transparent;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #6e6e73;
    cursor: pointer;
}

.tab.active {
    background: #1d1d1f;
    color: #fff;
}

.catalog-hint {
    margin-left: auto;
    font-size: 11px;
    color: #8e8e93;
}

.catalog-items {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 128px;
    padding: 10px 12px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    text-align: left;
}

.item.selected {
    border-color: #0071e3;
    box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.25);
}

.item.poor {
    opacity: 0.4;
    cursor: not-allowed;
}

.item-name {
    font-size: 13px;
    font-weight: 600;
}

.item-price {
    font-size: 12px;
    color: #1a7f37;
    font-variant-numeric: tabular-nums;
}

.item-meta {
    font-size: 10px;
    color: #8e8e93;
}

.bottom {
    display: grid;
    grid-template-columns: auto auto 220px 1fr;
    gap: 20px;
    align-items: center;
}

.modes {
    display: flex;
    gap: 6px;
}

.mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 58px;
    padding: 8px 0;
    border: none;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    font-size: 13px;
    font-weight: 600;
    color: #1d1d1f;
    cursor: pointer;
}

.mode small {
    font-size: 10px;
    font-weight: 500;
    color: #8e8e93;
}

.mode.active {
    background: #1d1d1f;
    color: #fff;
}

.mode.active small {
    color: rgba(255, 255, 255, 0.6);
}

.time {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.clock {
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.speeds {
    display: flex;
    gap: 4px;
}

.speed {
    border: none;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.05);
    font-size: 10px;
    padding: 3px 7px;
    cursor: pointer;
}

.speed.active {
    background: #34c759;
    color: #fff;
}

.money {
    font-size: 15px;
    font-weight: 700;
    color: #1a7f37;
    font-variant-numeric: tabular-nums;
}

.sim {
    display: flex;
    align-items: center;
    gap: 12px;
}

.plumbob {
    width: 18px;
    height: 30px;
    clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
    box-shadow: 0 0 12px rgba(52, 199, 89, 0.6);
}

.sim-name {
    font-size: 14px;
    font-weight: 700;
}

.sim-action {
    font-size: 12px;
    color: #6e6e73;
}

.needs {
    display: grid;
    grid-template-columns: repeat(2, minmax(150px, 1fr));
    gap: 5px 18px;
}

.need {
    display: grid;
    grid-template-columns: 56px 1fr;
    align-items: center;
    gap: 8px;
    font-size: 11px;
}

.need-label {
    color: #3a3a3c;
    font-weight: 600;
}

.need-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.need-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.25s ease, background 0.25s ease;
}
</style>
