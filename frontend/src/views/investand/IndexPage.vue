<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(103,65,217,0.08); color: #6741d9;">
          <q-icon name="trending_up" size="14px" />
          투자 분석 플랫폼
        </span>
        <h1 class="lp-title">한국 시장<br>투자 심리 지수</h1>
        <p class="lp-subtitle">
          Fear &amp; Greed Index와 주요 시장 지수를<br>실시간으로 확인하고 분석합니다
        </p>
        <div class="lp-actions">
          <q-btn
            class="lp-btn-primary"
            label="글로벌 자산"
            no-caps unelevated
            @click="router.push('/investand/global')"
          />
          <q-btn
            class="lp-btn-secondary"
            :label="refreshing ? '새로고침 중...' : '새로고침'"
            no-caps outline
            :loading="refreshing"
            @click="refreshData"
          />
        </div>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner-dots color="grey-6" size="36px" />
      </div>

      <template v-else>
        <!-- Stats Strip: KOSPI / KOSDAQ / Fear&Greed -->
        <div class="lp-stats">
          <div class="lp-stat">
            <div class="lp-stat__icon" style="color: #6741d9;"><q-icon name="show_chart" size="22px" /></div>
            <div class="lp-stat__value" style="font-size: 22px;">{{ formatNumber(marketData.kospi.current) }}</div>
            <div class="lp-stat__label">
              KOSPI
              <span :style="marketData.kospi.change >= 0 ? 'color:#34a853' : 'color:#ea4335'">
                {{ marketData.kospi.change >= 0 ? '+' : '' }}{{ marketData.kospi.changePercent }}%
              </span>
            </div>
          </div>
          <div class="lp-stat">
            <div class="lp-stat__icon" style="color: #118ab2;"><q-icon name="bar_chart" size="22px" /></div>
            <div class="lp-stat__value" style="font-size: 22px;">{{ formatNumber(marketData.kosdaq.current) }}</div>
            <div class="lp-stat__label">
              KOSDAQ
              <span :style="marketData.kosdaq.change >= 0 ? 'color:#34a853' : 'color:#ea4335'">
                {{ marketData.kosdaq.change >= 0 ? '+' : '' }}{{ marketData.kosdaq.changePercent }}%
              </span>
            </div>
          </div>
          <div class="lp-stat">
            <div class="lp-stat__icon" :style="{ color: indexAccentColor }"><q-icon name="psychology" size="22px" /></div>
            <div class="lp-stat__value" :style="{ color: indexAccentColor }">{{ currentIndex.value }}</div>
            <div class="lp-stat__label">{{ currentIndex.level || 'Fear & Greed' }}</div>
          </div>
        </div>

        <!-- Fear & Greed Index Card -->
        <div class="lp-card">
          <div class="lp-card__header">
            <span class="lp-card__title">Fear &amp; Greed Index</span>
            <span style="font-size: 12px; color: #86868b;">{{ currentIndex.date }} 기준</span>
          </div>

          <!-- Big index value -->
          <div class="row items-center q-mb-lg" style="gap: 24px; flex-wrap: wrap;">
            <div>
              <div class="lp-index-value" :style="{ color: indexAccentColor }">
                {{ currentIndex.value }}
              </div>
              <div style="font-size: 22px; font-weight: 600; color: #1d1d1f; margin-top: 4px;">
                {{ currentIndex.level }}
              </div>
            </div>
            <!-- Gauge bar -->
            <div style="flex: 1; min-width: 200px;">
              <div class="lp-gauge">
                <div class="lp-gauge__track">
                  <div class="lp-gauge__fill" :style="{ width: currentIndex.value + '%', background: indexAccentColor }" />
                </div>
                <div class="lp-gauge__labels">
                  <span>극도 공포</span>
                  <span>공포</span>
                  <span>중립</span>
                  <span>탐욕</span>
                  <span>극도 탐욕</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Component grid -->
          <div class="lp-component-grid">
            <div
              v-for="(val, key) in currentIndex.components"
              :key="key"
              class="lp-component-item"
            >
              <div class="lp-component-name">{{ componentName(key as string) }}</div>
              <div class="lp-component-value" :style="{ color: getValueColor(val) }">{{ val }}</div>
            </div>
          </div>
        </div>

        <!-- 30-day Chart -->
        <div class="lp-card q-mt-sm">
          <div class="lp-card__header">
            <span class="lp-card__title">30일 추이</span>
            <q-spinner-dots v-if="historyLoading" size="18px" color="grey-5" />
          </div>
          <div class="lp-chart-container">
            <canvas ref="chartCanvas" />
            <div v-if="historyLoading" class="lp-chart-overlay">
              <q-spinner color="grey-5" size="24px" />
            </div>
          </div>
        </div>

        <!-- Market Data -->
        <div class="lp-market-grid q-mt-sm">
          <div class="lp-data-card">
            <div class="lp-data-label">KOSPI</div>
            <div class="lp-data-value">{{ formatNumber(marketData.kospi.current) }}</div>
            <div class="lp-data-sub" :style="marketData.kospi.change >= 0 ? 'color:#34a853' : 'color:#ea4335'">
              {{ marketData.kospi.change >= 0 ? '+' : '' }}{{ marketData.kospi.change }}
              ({{ marketData.kospi.changePercent }}%)
            </div>
          </div>
          <div class="lp-data-card">
            <div class="lp-data-label">KOSDAQ</div>
            <div class="lp-data-value">{{ formatNumber(marketData.kosdaq.current) }}</div>
            <div class="lp-data-sub" :style="marketData.kosdaq.change >= 0 ? 'color:#34a853' : 'color:#ea4335'">
              {{ marketData.kosdaq.change >= 0 ? '+' : '' }}{{ marketData.kosdaq.change }}
              ({{ marketData.kosdaq.changePercent }}%)
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="lp-error q-mt-md">
          <q-icon name="warning_amber" size="18px" />
          {{ error }}
          <q-btn flat dense size="sm" label="재시도" @click="loadData" />
        </div>

        <!-- Quick Navigation -->
        <div class="lp-nav-grid">
          <div class="lp-nav-card" @click="router.push('/investand/global')">
            <div class="lp-nav-card__icon" style="background: rgba(103,65,217,0.08); color: #6741d9;">
              <q-icon name="public" size="24px" />
            </div>
            <div class="lp-nav-card__title">글로벌 자산</div>
            <div class="lp-nav-card__desc">금·원유·달러 등 글로벌 자산 비교</div>
            <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
          </div>
          <div class="lp-nav-card" @click="router.push('/investand/sector')">
            <div class="lp-nav-card__icon" style="background: rgba(17,138,178,0.08); color: #118ab2;">
              <q-icon name="donut_large" size="24px" />
            </div>
            <div class="lp-nav-card__title">섹터 비교</div>
            <div class="lp-nav-card__desc">산업별 수익률 및 벤치마크 분석</div>
            <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
          </div>
          <div class="lp-nav-card" @click="router.push('/investand/dart')">
            <div class="lp-nav-card__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="description" size="24px" />
            </div>
            <div class="lp-nav-card__title">DART 공시</div>
            <div class="lp-nav-card__desc">금융감독원 공시 데이터 조회</div>
            <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
          </div>
        </div>

      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { fearGreedApi, marketApi, type FearGreedIndex, type MarketData, type FearGreedHistoryItem } from '@/api/investand/api'
import { Chart, registerables } from 'chart.js'
import PageHeader from '@/components/common/PageHeader.vue'

Chart.register(...registerables)

const router = useRouter()
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
  kospi: { current: 0, change: 0, changePercent: 0, volume: 0, marketCap: 0 },
  kosdaq: { current: 0, change: 0, changePercent: 0, volume: 0, marketCap: null }
})

const indexAccentColor = computed(() => {
  const v = currentIndex.value.value
  if (v < 25) return '#ea4335'
  if (v < 45) return '#fa8334'
  if (v < 55) return '#f5a623'
  if (v < 75) return '#34a853'
  return '#1a7f4b'
})

function componentName(key: string): string {
  const map: Record<string, string> = {
    priceMomentum: '주가 모멘텀',
    investorSentiment: '투자자 심리',
    putCallRatio: '풋/콜 비율',
    volatilityIndex: '변동성',
    safeHavenDemand: '안전자산'
  }
  return map[key] || key
}

function getValueColor(v: number): string {
  if (v < 25) return '#ea4335'
  if (v < 45) return '#fa8334'
  if (v < 55) return '#f5a623'
  if (v < 75) return '#34a853'
  return '#1a7f4b'
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0.00'
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
    $q.notify({ type: 'negative', message: '데이터 로딩 실패', caption: '잠시 후 다시 시도해주세요.', timeout: 3000, position: 'top' })
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
  } catch {
    // silent
  } finally {
    historyLoading.value = false
  }
}

function renderChart() {
  if (!chartCanvas.value || historicalData.value.length === 0) return
  if (chartInstance) chartInstance.destroy()
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  const labels = [...historicalData.value].reverse().map(d => d.date.slice(5))
  const values = [...historicalData.value].reverse().map(d => d.value)

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sorted.map(d => d.date),
      datasets: [{
        label: 'Fear & Greed',
        data: values,
        borderColor: '#6741d9',
        backgroundColor: 'rgba(103,65,217,0.08)',
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
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, maxTicksLimit: 8 }
        }
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
  $q.notify({ type: 'positive', message: '업데이트 완료', timeout: 1500, position: 'top' })
}

watch(historicalData, renderChart)
onMounted(() => loadData())
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';

.lp-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(234,67,53,0.06);
  border-radius: 10px;
  font-size: 13px;
  color: #ea4335;
}

.lp-gauge {
  width: 100%;
}

.lp-gauge__track {
  height: 8px;
  background: #f5f5f7;
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 8px;
}

.lp-gauge__fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.6s ease;
}

.lp-gauge__labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #86868b;
}

// Fear/Greed color scheme
.fg--extreme-fear  { color: #ef4444; }
.fg--fear          { color: #f97316; }
.fg--neutral       { color: #eab308; }
.fg--greed         { color: #84cc16; }
.fg--extreme-greed { color: #10b981; }

.error-banner { border: 1px solid rgba(239,68,68,0.2); }
</style>
