<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useCityGameStore } from '../store/store_citygame'
import { tileIdOf } from '../geo/tileMath'
import { LAND_PRICE } from '../config/economy'

defineProps<{ ownerName: string }>()
const emit = defineEmits<{ (event: 'claim'): void; (event: 'purchase'): void; (event: 'enter-home'): void }>()

const store = useCityGameStore()

const currentTileId = computed(() => (store.currentTile ? tileIdOf(store.currentTile) : null))
const claim = computed(() => (currentTileId.value ? store.claims.get(currentTileId.value) ?? null : null))
const occupantCount = computed(() => (currentTileId.value ? store.occupantCounts.get(currentTileId.value) ?? 0 : 0))
const isMine = computed(() => !!claim.value && claim.value.ownerId === store.localOwnerId)
const homeHere = computed(() => (currentTileId.value ? store.homes.get(currentTileId.value) ?? null : null))
const price = computed(() => claim.value?.price ?? LAND_PRICE)
const canPay = computed(() => store.household >= price.value)

// Reservation countdown — ticks locally against the server's reservedUntil.
const now = ref(Date.now())
const timer = window.setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => window.clearInterval(timer))

const remainingLabel = computed(() => {
    const until = claim.value?.reservedUntil
    if (!until) return ''
    const secs = Math.max(0, Math.round((until - now.value) / 1000))
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
})

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
        <div class="claim-block">
            <template v-if="!claim">
                <span class="hint">빈 땅 · 선점하면 5분간 우선 구매권</span>
                <button class="claim-btn" @click="emit('claim')">이 땅 선점하기</button>
            </template>

            <template v-else-if="claim.status === 'reserved' && isMine">
                <span class="label reserved">선점권 보유 · {{ remainingLabel }} 남음</span>
                <button class="claim-btn buy" :disabled="!canPay" @click="emit('purchase')">
                    §{{ price.toLocaleString() }}에 구매하기
                </button>
                <span v-if="!canPay" class="hint warn">가계 자금이 부족합니다</span>
            </template>

            <template v-else-if="claim.status === 'reserved'">
                <span class="label owner">{{ claim.ownerName }} 선점 중 · {{ remainingLabel }}</span>
            </template>

            <template v-else-if="isMine">
                <span class="label owner mine">내 땅</span>
                <button v-if="homeHere" class="claim-btn home" @click="emit('enter-home')">집 들어가기 (I)</button>
                <span v-else class="hint">툴바 6번 &lsquo;내 집&rsquo;으로 집을 지으세요</span>
            </template>

            <template v-else>
                <span class="label owner">{{ claim.ownerName }}의 땅</span>
            </template>
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

.claim-block {
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hint {
    font-size: 11px;
    color: #6e6e73;
}

.hint.warn {
    color: #d70015;
}

.reserved {
    color: #a05a00;
    font-weight: 600;
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

.claim-btn.buy {
    background: #0071e3;
}

.claim-btn.home {
    background: #1a7f37;
}

.claim-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
</style>
