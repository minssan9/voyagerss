<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useCityGameStore } from '../store/store_citygame'

type Features = {
    tiles: { x: number; z: number; size: number; color: string }[]
    objects: { x: number; z: number; size: number; tool: string; funded: boolean }[]
}

const props = defineProps<{ features: (x: number, z: number, radius: number) => Features | null }>()

const store = useCityGameStore()
const canvas = ref<HTMLCanvasElement | null>(null)

const MAP_PX = 180
const MAP_RADIUS_M = 90

const OBJECT_COLORS: Record<string, string> = {
    road: '#4a4d55',
    'zone-residential': '#59d973',
    'zone-commercial': '#4d8cf2',
    'zone-industrial': '#f29940',
    home: '#f9c75a',
    'facility-park': '#2f9e44',
    'facility-hospital': '#f25a66',
    'facility-police': '#4d73d9',
    'facility-school': '#d9804d',
    'facility-landmark': '#a673f2',
}

/** North-up minimap centered on the player (GTA-style), redrawn a few times a second from the tile streamer. */
function draw() {
    const el = canvas.value
    const roam = store.roam
    if (!el || !roam) return
    const ctx = el.getContext('2d')
    if (!ctx) return
    const data = props.features(roam.x, roam.z, MAP_RADIUS_M)
    const scale = MAP_PX / 2 / MAP_RADIUS_M
    // World +z is "north"; canvas y grows downward.
    const toPx = (x: number, z: number) => [MAP_PX / 2 + (x - roam.x) * scale, MAP_PX / 2 - (z - roam.z) * scale] as const

    ctx.clearRect(0, 0, MAP_PX, MAP_PX)
    ctx.save()
    ctx.beginPath()
    ctx.arc(MAP_PX / 2, MAP_PX / 2, MAP_PX / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#c9ccd1'
    ctx.fillRect(0, 0, MAP_PX, MAP_PX)

    for (const t of data?.tiles ?? []) {
        const [px, py] = toPx(t.x - t.size / 2, t.z + t.size / 2)
        ctx.fillStyle = t.color
        ctx.fillRect(px, py, t.size * scale, t.size * scale)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.strokeRect(px, py, t.size * scale, t.size * scale)
    }
    for (const o of data?.objects ?? []) {
        const s = Math.max(4, o.size * scale * (o.tool === 'road' ? 1 : 0.75))
        const [px, py] = toPx(o.x, o.z)
        ctx.fillStyle = OBJECT_COLORS[o.tool] ?? '#888'
        ctx.fillRect(px - s / 2, py - s / 2, s, s)
        if (!o.funded) {
            ctx.fillStyle = '#ff3b30'
            ctx.beginPath()
            ctx.arc(px, py, 3, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    // Player arrow, pointing along its heading (heading 0 = +z = up on the map).
    ctx.translate(MAP_PX / 2, MAP_PX / 2)
    ctx.rotate(roam.heading)
    ctx.fillStyle = roam.inCar ? '#ff3b30' : '#ffffff'
    ctx.strokeStyle = '#1d1d1f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -9)
    ctx.lineTo(6, 7)
    ctx.lineTo(0, 3)
    ctx.lineTo(-6, 7)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = '#1d1d1f'
    ctx.font = 'bold 11px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('N', MAP_PX / 2, 13)
}

let timer = 0
onMounted(() => {
    timer = window.setInterval(draw, 200)
    draw()
})
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
    <div class="roam">
        <div class="minimap-wrap">
            <canvas ref="canvas" class="minimap" :width="MAP_PX" :height="MAP_PX" />
        </div>

        <div v-if="store.roam?.inCar" class="speedo">
            <span class="speed">{{ store.roam.speedKmh }}</span>
            <span class="unit">km/h</span>
        </div>

        <transition name="prompt">
            <div v-if="store.roam?.prompt" class="prompt">{{ store.roam.prompt }}</div>
        </transition>

        <div class="controls">
            <template v-if="store.roam?.inCar">W 가속 · S 브레이크/후진 · A D 핸들 · Space 핸드브레이크 · F 내리기</template>
            <template v-else>W A S D 이동 · Shift 달리기 · Space 점프 · 마우스 드래그 시점 · F 차 · Tab 설계 모드</template>
        </div>
    </div>
</template>

<style scoped>
.roam {
    position: absolute;
    inset: 0;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Apple SD Gothic Neo', system-ui, sans-serif;
}

.minimap-wrap {
    position: absolute;
    left: 20px;
    bottom: 96px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    border: 4px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    overflow: hidden;
}

.minimap {
    display: block;
}

.speedo {
    position: absolute;
    right: 24px;
    bottom: 110px;
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 10px 18px;
    border-radius: 16px;
    background: rgba(29, 29, 31, 0.75);
    color: #fff;
}

.speed {
    font-size: 34px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.unit {
    font-size: 13px;
    opacity: 0.7;
}

.prompt {
    position: absolute;
    left: 50%;
    top: 58%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 999px;
    background: rgba(29, 29, 31, 0.82);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
}

.prompt-enter-active,
.prompt-leave-active {
    transition: opacity 0.15s ease;
}
.prompt-enter-from,
.prompt-leave-to {
    opacity: 0;
}

.controls {
    position: absolute;
    left: 50%;
    top: 20px;
    transform: translateX(-50%);
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    font-size: 12px;
    color: #1d1d1f;
    white-space: nowrap;
}
</style>
