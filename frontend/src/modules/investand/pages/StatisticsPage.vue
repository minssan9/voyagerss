<template>
  <q-page class="q-pa-md">
    <div class="row">
      <div class="col-12">
        <div class="text-h4 q-mb-md">
          📊 Fear & Greed Index 통계
        </div>
        <div class="text-subtitle1 text-grey-7 q-mb-xl">
          상세한 통계와 분석 정보를 확인하세요
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="row q-gutter-md q-mb-xl">
      <div class="col-12 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <q-icon name="analytics" size="2rem" color="primary" class="q-mb-sm" />
            <div class="text-h6">평균값</div>
            <div class="text-h4 text-primary">{{ statistics.average.toFixed(1) }}</div>
            <div class="text-caption text-grey-6">30일 평균</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <q-icon name="trending_up" size="2rem" color="positive" class="q-mb-sm" />
            <div class="text-h6">최고값</div>
            <div class="text-h4 text-positive">{{ statistics.max }}</div>
            <div class="text-caption text-grey-6">{{ statistics.maxDate }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <q-icon name="trending_down" size="2rem" color="negative" class="q-mb-sm" />
            <div class="text-h6">최저값</div>
            <div class="text-h4 text-negative">{{ statistics.min }}</div>
            <div class="text-caption text-grey-6">{{ statistics.minDate }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-3">
        <q-card class="stat-card">
          <q-card-section class="text-center">
            <q-icon name="show_chart" size="2rem" color="warning" class="q-mb-sm" />
            <div class="text-h6">변동성</div>
            <div class="text-h4 text-warning">{{ statistics.volatility.toFixed(1) }}</div>
            <div class="text-caption text-grey-6">표준편차</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Distribution Chart -->
    <div class="row q-mb-xl">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">레벨별 분포</div>
            <div class="distribution-container">
              <div class="distribution-chart">
                📊 Fear & Greed Index 레벨별 분포 차트 (Chart.js 구현 예정)
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Detailed Statistics -->
    <div class="row q-gutter-md">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">기술적 지표</div>
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label>RSI (14일)</q-item-label>
                  <q-item-label caption>{{ technicalIndicators.rsi.toFixed(2) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>이동평균 (7일)</q-item-label>
                  <q-item-label caption>{{ technicalIndicators.ma7.toFixed(2) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>이동평균 (30일)</q-item-label>
                  <q-item-label caption>{{ technicalIndicators.ma30.toFixed(2) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>볼린저 밴드 상단</q-item-label>
                  <q-item-label caption>{{ technicalIndicators.bollingerUpper.toFixed(2) }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>볼린저 밴드 하단</q-item-label>
                  <q-item-label caption>{{ technicalIndicators.bollingerLower.toFixed(2) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">레벨별 일수</div>
            <q-list>
              <q-item v-for="(count, level) in levelCounts" :key="level">
                <q-item-section>
                  <q-item-label>{{ getLevelName(level) }}</q-item-label>
                  <q-item-label caption>{{ count }}일 ({{ ((count / 30) * 100).toFixed(1) }}%)</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-linear-progress
                    :value="count / 30"
                    :color="getLevelColor(level)"
                    class="level-progress"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { fearGreedApi, type HistoryData } from '../services/api'

// 반응형 데이터
const historyData = ref<HistoryData[]>([])

// 통계 계산
const statistics = computed(() => {
  if (historyData.value.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      maxDate: '',
      minDate: '',
      volatility: 0
    }
  }

  const values = historyData.value.map(d => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const average = values.reduce((sum, val) => sum + val, 0) / values.length
  
  // 표준편차 계산
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
  const volatility = Math.sqrt(variance)

  const maxItem = historyData.value.find(d => d.value === max)
  const minItem = historyData.value.find(d => d.value === min)

  return {
    average,
    max,
    min,
    maxDate: maxItem ? new Date(maxItem.date).toLocaleDateString('ko-KR') : '',
    minDate: minItem ? new Date(minItem.date).toLocaleDateString('ko-KR') : '',
    volatility
  }
})

// 기술적 지표 (샘플 데이터)
const technicalIndicators = computed(() => ({
  rsi: 45.67,
  ma7: statistics.value.average,
  ma30: statistics.value.average,
  bollingerUpper: statistics.value.average + (statistics.value.volatility * 2),
  bollingerLower: statistics.value.average - (statistics.value.volatility * 2)
}))

// 레벨별 카운트
const levelCounts = computed(() => {
  const counts: Record<string, number> = {
    'extreme-fear': 0,
    'fear': 0,
    'neutral': 0,
    'greed': 0,
    'extreme-greed': 0
  }

  historyData.value.forEach(item => {
    if (item.value < 25) counts['extreme-fear']++
    else if (item.value < 45) counts['fear']++
    else if (item.value < 55) counts['neutral']++
    else if (item.value < 75) counts['greed']++
    else counts['extreme-greed']++
  })

  return counts
})

// 메서드
function getLevelName(level: string): string {
  const names: Record<string, string> = {
    'extreme-fear': 'Extreme Fear',
    'fear': 'Fear',
    'neutral': 'Neutral',
    'greed': 'Greed',
    'extreme-greed': 'Extreme Greed'
  }
  return names[level] || level
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    'extreme-fear': 'red',
    'fear': 'orange',
    'neutral': 'yellow',
    'greed': 'light-green',
    'extreme-greed': 'green'
  }
  return colors[level] || 'grey'
}

async function loadStatisticsData(): Promise<void> {
  try {
    const data = await fearGreedApi.getHistoryData(30)
    historyData.value = data
  } catch (error) {
    console.error('Failed to load statistics data:', error)
  }
}

// 라이프사이클
onMounted(() => {
  loadStatisticsData()
})
</script>

<style lang="scss" scoped>
.stat-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.distribution-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 1.2rem;
  color: #666;
}

.level-progress {
  width: 100px;
  height: 8px;
}

@media (max-width: 768px) {
  .distribution-chart {
    height: 200px;
    font-size: 1rem;
  }
}
</style> 