<script setup lang="ts">
import { computed } from 'vue'
import { useCityGameStore } from '../store/store_citygame'
import { tileIdOf } from '../geo/tileMath'

const props = defineProps<{ ownerName: string }>()
const emit = defineEmits<{ (event: 'claim'): void }>()

const store = useCityGameStore()

const currentTileId = computed(() => (store.currentTile ? tileIdOf(store.currentTile) : null))
const claim = computed(() => (currentTileId.value ? store.claims.get(currentTileId.value) ?? null : null))
const occupantCount = computed(() => (currentTileId.value ? store.occupantCounts.get(currentTileId.value) ?? 0 : 0))

const connectionLabel = computed(() => {
    switch (store.connectionStatus) {
        case 'connected':
            return '연결됨'
        case 'connecting':
            return '연결 중...'
        default:
            return '오프라인'
    }
})

const geoLabel = computed(() => {
    if (!store.geoCenter) return ''
    return `${store.geoCenter.lat.toFixed(5)}, ${store.geoCenter.lon.toFixed(5)}`
})
</script>

<template>
    <div class="status-card">
        <div class="row">
            <span class="dot" :class="store.connectionStatus" />
            <span class="label">{{ connectionLabel }}</span>
            <span class="divider" />
            <span class="label">{{ occupantCount }} nearby</span>
        </div>
        <div class="row">
            <span class="coord">{{ geoLabel }}</span>
        </div>
        <div class="row claim-row">
            <template v-if="claim">
                <span class="label owner" :class="{ mine: store.isClaimedByMe(currentTileId ?? '') }">
                    {{ store.isClaimedByMe(currentTileId ?? '') ? '내 타일' : `${claim.ownerName}의 타일` }}
                </span>
            </template>
            <button v-else class="claim-btn" @click="emit('claim')">이 타일 선점하기</button>
        </div>
    </div>
</template>

<style scoped>
.status-card {
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 220px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
}

.row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ff3b30;
}
.dot.connected {
    background: #34c759;
}
.dot.connecting {
    background: #ff9f0a;
}

.label {
    font-size: 12px;
    font-weight: 500;
    color: #1d1d1f;
}

.divider {
    width: 1px;
    height: 12px;
    background: rgba(0, 0, 0, 0.12);
}

.coord {
    font-size: 11px;
    color: #6e6e73;
    font-variant-numeric: tabular-nums;
}

.claim-row {
    margin-top: 2px;
}

.owner {
    opacity: 0.75;
}
.owner.mine {
    opacity: 1;
    color: #1a7f37;
}

.claim-btn {
    border: none;
    border-radius: 999px;
    background: #1d1d1f;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    cursor: pointer;
    width: 100%;
}
</style>
