<template>
  <q-page padding class="module-page">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <q-spinner-dots color="primary" size="40px" />
      <span class="loading-state__text">데이터 로딩 중...</span>
    </div>

    <div v-else>
      <PageHeader
        title="Fear & Greed Index"
        subtitle="한국 주식시장의 투자자 심리를 실시간으로 확인하세요"
        icon="psychology"
        :breadcrumb="[{ label: 'Investand' }, { label: 'Fear & Greed Index' }]"
      >
        <template #actions>
          <q-btn flat round icon="refresh" :loading="refreshing" @click="refreshData" />
        </template>
      </PageHeader>

      <div class="row q-col-gutter-lg">
        <!-- Current index card -->
        <div class="col-12 col-md-4">
          <div class="fg-main-card">
            <div class="fg-main-card__label">현재 Fear & Greed Index</div>
            <div class="fg-main-card__value" :class="indexColorClass2">
              {{ currentIndex.value }}
            </div>
            <div class="fg-main-card__level" :class="indexColorClass2">
              {{ currentIndex.level }}
            </div>
            <div class="fg-main-card__date">{{ currentIndex.date }} 업데이트</div>
          </div>
        </div>

        <!-- Component scores -->
        <div class="col-12 col-md-8">
          <div class="content-card">
            <div class="content-card__header">구성 지표</div>
            <div class="fg-components">
              <div
                v-for="(val, key) in currentIndex.components"
                :key="key"
                class="fg-component-item"
              >
                <span class="fg-component-item__name">{{ getComponentName(key) }}</span>
                <div class="fg-component-item__bar">
                  <div
                    class="fg-component-item__fill"
                    :style="{ width: val + '%', background: getComponentColor(val) }"
                  />
                </div>
                <span class="fg-component-item__val" :style="{ color: getComponentColor(val) }">{{ val }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart -->
        <div class="col-12">
          <div class="content-card">
            <div class="content-card__header">
              <q-icon name="show_chart" size="18px" class="q-mr-sm" />
              30일 추이
            </div>
            <div class="chart-wrapper">
              <canvas ref="chartCanvas" height="280"></canvas>
              <div v-if="historyLoading" class="chart-overlay">
                <q-spinner color="primary" size="2em" />
              </div>
            </div>
          </div>
        </div>

        <!-- Market data -->
        <div class="col-12 col-sm-6">
          <div class="market-card">
            <div class="market-card__name">KOSPI</div>
            <div class="market-card__value">{{ formatNumber(marketData.kospi.current) }}</div>
            <div :class="['market-card__change', marketData.kospi.change >= 0 ? 'market-card__change--up' : 'market-card__change--down']">
              {{ marketData.kospi.change >= 0 ? '+' : '' }}{{ marketData.kospi.change }}
              ({{ marketData.kospi.changePercent }}%)
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-6">
          <div class="market-card">
            <div class="market-card__name">KOSDAQ</div>
            <div class="market-card__value">{{ formatNumber(marketData.kosdaq.current) }}</div>
            <div :class="['market-card__change', marketData.kosdaq.change >= 0 ? 'market-card__change--up' : 'market-card__change--down']">
              {{ marketData.kosdaq.change >= 0 ? '+' : '' }}{{ marketData.kosdaq.change }}
              ({{ marketData.kosdaq.changePercent }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="q-mt-lg">
        <q-banner class="error-banner" rounded>
          <template #avatar><q-icon name="warning" /></template>
          {{ error }}
          <template #action><q-btn flat label="재시도" @click="loadData" /></template>
        </q-banner>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { fearGreedApi, marketApi, type FearGreedIndex, type MarketData, type FearGreedHistoryItem } from '@/api/investand/api'
import { Chart, registerables } from 'chart.js'
import PageHeader from '@/components/common/PageHeader.vue'

Chart.register(...registerables)

const $q = useQuasar()
const loading = ref(true)
const refreshing = ref(false)
const historyLoading = ref(false)
const error = ref('')
const chartCanvas = ref<HTMLCanvasElement | null>(null)
let chartInstance: Chart | null = null

const currentIndex = ref<FearGreedIndex>({
  value: 0,
  level: '',
  date: '',
  components: { priceMomentum: 0, investorSentiment: 0, putCallRatio: 0, volatilityIndex: 0, safeHavenDemand: 0 }
})

const historicalData = ref<FearGreedHistoryItem[]>([])

const marketData = ref<MarketData>({
  kospi:  { current: 0, change: 0, changePercent: 0, volume: 0, marketCap: 0 },
  kosdaq: { current: 0, change: 0, changePercent: 0, volume: 0, marketCap: null }
})

function getComponentColor(value: number): string {
  if (value < 25) return '#ef4444'
  if (value < 45) return '#f97316'
  if (value < 55) return '#eab308'
  if (value < 75) return '#84cc16'
  return '#10b981'
}

function indexCssClass(value: number): string {
  if (value < 25) return 'fg--extreme-fear'
  if (value < 45) return 'fg--fear'
  if (value < 55) return 'fg--neutral'
  if (value < 75) return 'fg--greed'
  return 'fg--extreme-greed'
}

const indexColorClass2 = computed(() => indexCssClass(currentIndex.value.value))

function getComponentName(key: string): string {
  const names: Record<string, string> = {
    priceMomentum: '주가 모멘텀',
    investorSentiment: '투자자 심리',
    putCallRatio: '풋/콜 비율',
    volatilityIndex: '변동성 지수',
    safeHavenDemand: '안전자산 수요'
  }
  return names[key] || key
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadData(): Promise<void> {
  try {
    error.value = ''
    const [indexData, marketInfo] = await Promise.all([
      fearGreedApi.getCurrentIndex(),
      marketApi.getAllMarketData()
    ])
    currentIndex.value = indexData
    marketData.value = marketInfo
    await loadHistoricalData()
  } catch (err) {
    error.value = '데이터를 불러오는 중 오류가 발생했습니다.'
    console.error('Failed to load data:', err)
    $q.notify({ type: 'negative', message: '데이터 로딩 실패', timeout: 3000, position: 'top' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadHistoricalData() {
  historyLoading.value = true
  try {
    historicalData.value = await fearGreedApi.getHistory(30)
    renderChart()
  } catch (err) {
    console.error('Failed to load historical data:', err)
  } finally {
    historyLoading.value = false
  }
}

function renderChart() {
  if (!chartCanvas.value || !historicalData.value.length) return
  if (chartInstance) chartInstance.destroy()

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  const sorted = [...historicalData.value].reverse()
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(d => d.date),
      datasets: [{
        label: 'Fear & Greed Index',
        data: sorted.map(d => d.value),
        borderColor: '#0037EB',
        backgroundColor: 'rgba(0, 55, 235, 0.06)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  })
}

async function refreshData(): Promise<void> {
  refreshing.value = true
  await loadData()
  $q.notify({ type: 'positive', message: '업데이트 완료', timeout: 2000, position: 'top' })
}

watch(historicalData, renderChart)

onMounted(loadData)
</script>

<style scoped lang="scss">
.module-page {
  background: var(--voy-bg, #f5f5f7);
  min-height: 100%;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 0;

  &__text {
    font-size: 16px;
    color: var(--voy-text-secondary, #6e6e73);
  }
}

// Fear & Greed main card
.fg-main-card {
  background: var(--voy-surface, #fff);
  border-radius: var(--voy-radius-lg, 16px);
  border: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  padding: 32px 24px;
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &__label {
    font-size: 13px;
    color: var(--voy-text-secondary, #6e6e73);
    font-weight: 500;
    margin-bottom: 4px;
  }

  &__value {
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  &__level {
    font-size: 18px;
    font-weight: 600;
  }

  &__date {
    font-size: 12px;
    color: var(--voy-text-muted, #9ca3af);
    margin-top: 4px;
  }
}

// Component breakdown
.content-card {
  background: var(--voy-surface, #fff);
  border-radius: var(--voy-radius-lg, 16px);
  border: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    font-size: 15px;
    font-weight: 600;
    color: var(--voy-text, #1d1d1f);
    border-bottom: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  }
}

.fg-components {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fg-component-item {
  display: grid;
  grid-template-columns: 120px 1fr 36px;
  align-items: center;
  gap: 12px;

  &__name {
    font-size: 13px;
    color: var(--voy-text-secondary, #6e6e73);
    white-space: nowrap;
  }

  &__bar {
    height: 6px;
    background: rgba(0,0,0,0.06);
    border-radius: 99px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 99px;
    transition: width 600ms ease;
  }

  &__val {
    font-size: 13px;
    font-weight: 600;
    text-align: right;
  }
}

// Chart
.chart-wrapper {
  padding: 16px 20px 20px;
  height: 300px;
  position: relative;
}

.chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.75);
}

// Market cards
.market-card {
  background: var(--voy-surface, #fff);
  border-radius: var(--voy-radius-lg, 16px);
  border: 1px solid var(--voy-border, rgba(0,0,0,0.06));
  padding: 24px;
  text-align: center;

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: var(--voy-text-secondary, #6e6e73);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    color: var(--voy-text, #1d1d1f);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  &__change {
    font-size: 14px;
    font-weight: 500;

    &--up { color: var(--voy-success, #10b981); }
    &--down { color: var(--voy-error, #ef4444); }
  }
}

// Fear/Greed color scheme
.fg--extreme-fear  { color: #ef4444; }
.fg--fear          { color: #f97316; }
.fg--neutral       { color: #eab308; }
.fg--greed         { color: #84cc16; }
.fg--extreme-greed { color: #10b981; }

.error-banner { border: 1px solid rgba(239,68,68,0.2); }
</style>
