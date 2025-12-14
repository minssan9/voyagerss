<template>
  <q-page class="row items-center justify-evenly">
    <div class="full-width">
      <!-- Loading State -->
      <div v-if="loading" class="row justify-center q-pa-xl">
        <q-spinner-dots color="primary" size="3em" />
        <div class="text-h6 q-ml-md">데이터 로딩 중...</div>
      </div>

      <!-- Main Content -->
      <div v-else>
        <!-- Header Section -->
        <div class="q-pa-md">
          <div class="text-h3 text-center q-mb-md">
            🇰🇷 investand
          </div>
          <div class="text-h6 text-center text-grey-7 q-mb-xl">
            한국 주식시장의 투자자 심리를 실시간으로 확인하세요
          </div>
        </div>

        <!-- Current Index Card -->
        <div class="row justify-center q-mb-xl">
          <q-card class="fear-greed-card" style="min-width: 400px;">
            <q-card-section class="text-center">
              <div class="text-h4 q-mb-md">현재 Fear & Greed Index</div>
              <div class="index-value q-mb-md" :class="indexLevelClass">
                {{ currentIndex.value }}
              </div>
              <div class="text-h5 q-mb-sm" :class="indexLevelClass">
                {{ currentIndex.level }}
              </div>
              <div class="text-caption text-grey-6">
                {{ currentIndex.date }} 업데이트
              </div>
              <q-btn 
                flat 
                round 
                icon="refresh" 
                @click="refreshData"
                :loading="refreshing"
                class="q-mt-sm"
              />
            </q-card-section>
          </q-card>
        </div>

        <!-- Components Cards -->
        <div class="row q-gutter-md justify-center q-mb-xl">
          <q-card v-for="(component, key) in currentIndex.components" :key="key" class="component-card">
            <q-card-section class="text-center">
              <div class="text-h6 q-mb-sm">{{ getComponentName(key) }}</div>
              <div class="text-h4" :class="getComponentClass(component)">
                {{ component }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Chart Section -->
        <div class="row justify-center q-mb-xl">
          <q-card class="chart-card" style="min-width: 800px;">
            <q-card-section>
              <div class="text-h5 q-mb-md text-center">30일 추이</div>
              <div class="chart-container">
                <!-- Chart.js 차트가 여기에 들어갈 예정 -->
                <div class="chart-placeholder">
                  📊 차트 영역 (Chart.js 구현 예정)
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Market Data Cards -->
        <div class="row q-gutter-md justify-center">
          <q-card class="market-card">
            <q-card-section class="text-center">
              <div class="text-h6 q-mb-sm">KOSPI</div>
              <div class="text-h4 q-mb-xs">{{ formatNumber(marketData.kospi.current) }}</div>
              <div :class="marketData.kospi.change >= 0 ? 'text-positive' : 'text-negative'">
                {{ marketData.kospi.change >= 0 ? '+' : '' }}{{ marketData.kospi.change }}
                ({{ marketData.kospi.changePercent }}%)
              </div>
            </q-card-section>
          </q-card>

          <q-card class="market-card">
            <q-card-section class="text-center">
              <div class="text-h6 q-mb-sm">KOSDAQ</div>
              <div class="text-h4 q-mb-xs">{{ formatNumber(marketData.kosdaq.current) }}</div>
              <div :class="marketData.kosdaq.change >= 0 ? 'text-positive' : 'text-negative'">
                {{ marketData.kosdaq.change >= 0 ? '+' : '' }}{{ marketData.kosdaq.change }}
                ({{ marketData.kosdaq.changePercent }}%)
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="row justify-center q-mt-lg">
          <q-banner class="text-negative" rounded>
            <template v-slot:avatar>
              <q-icon name="warning" />
            </template>
            {{ error }}
            <template v-slot:action>
              <q-btn flat label="재시도" @click="loadData" />
            </template>
          </q-banner>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { fearGreedApi, marketApi, type FearGreedIndex, type MarketData } from '../services/api'

const $q = useQuasar()

// 반응형 데이터
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

const currentIndex = ref<FearGreedIndex>({
  value: 0,
  level: '',
  date: '',
  components: {
    priceMomentum: 0,
    investorSentiment: 0,
    putCallRatio: 0,
    volatilityIndex: 0,
    safeHavenDemand: 0
  }
})

const marketData = ref<MarketData>({
  kospi: {
    current: 0,
    change: 0,
    changePercent: 0
  },
  kosdaq: {
    current: 0,
    change: 0,
    changePercent: 0
  }
})

// 컴퓨티드 속성
const indexLevelClass = computed(() => {
  const value = currentIndex.value.value
  if (value < 25) return 'text-red-8'
  if (value < 45) return 'text-orange-8'
  if (value < 55) return 'text-yellow-8'
  if (value < 75) return 'text-light-green-8'
  return 'text-green-8'
})

// 메서드
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

function getComponentClass(value: number): string {
  if (value < 25) return 'text-red-7'
  if (value < 45) return 'text-orange-7'
  if (value < 55) return 'text-yellow-7'
  if (value < 75) return 'text-light-green-7'
  return 'text-green-7'
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00'
  }
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

async function loadData(): Promise<void> {
  try {
    error.value = ''
    
    // 병렬로 데이터 로드
    const [indexData, marketInfo] = await Promise.all([
      fearGreedApi.getCurrentIndex(),
      marketApi.getAllMarketData()
    ])
    
    currentIndex.value = indexData
    marketData.value = marketInfo
    
  } catch (err) {
    error.value = '데이터를 불러오는 중 오류가 발생했습니다.'
    console.error('Failed to load data:', err)
    
    $q.notify({ type: 'negative', message: '데이터 로딩 실패', caption: '잠시 후 다시 시도해주세요.', timeout: 3000, position: 'top' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refreshData(): Promise<void> {
  refreshing.value = true
  await loadData()
  
  $q.notify({ type: 'positive', message: '데이터가 업데이트되었습니다.', timeout: 2000, position: 'top' })
}

// 라이프사이클
onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.fear-greed-card {
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
}

.component-card {
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.market-card {
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.chart-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
}

.index-value {
  font-size: 4rem;
  font-weight: bold;
  line-height: 1;
}

.chart-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 1.2rem;
  color: #666;
}

@media (max-width: 768px) {
  .chart-card {
    min-width: 95vw;
  }
  
  .fear-greed-card {
    min-width: 95vw;
  }
  
  .index-value {
    font-size: 3rem;
  }
}
</style> 