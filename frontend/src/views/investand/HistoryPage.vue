<template>
  <q-page class="q-pa-md">
    <div class="row">
      <div class="col-12">
        <div class="text-h4 q-mb-md">
          📈 Fear & Greed Index 히스토리
        </div>
        <div class="text-subtitle1 text-grey-7 q-mb-xl">
          과거 30일간의 Fear & Greed Index 변화를 확인하세요
        </div>
      </div>
    </div>

    <!-- Date Range Selector -->
    <div class="row q-mb-xl">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">기간 선택</div>
            <div class="row q-gutter-md">
              <q-btn-toggle
                v-model="selectedPeriod"
                toggle-color="primary"
                :options="periodOptions"
                @update:model-value="loadHistoryData"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="3em" />
      <div class="text-h6 q-ml-md">데이터 로딩 중...</div>
    </div>

    <!-- Chart Section -->
    <div v-else class="row q-mb-xl">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h5 q-mb-md">{{ selectedPeriod }}일 추이</div>
            <div class="chart-container">
              <!-- Chart.js will be implemented here -->
              <div class="chart-placeholder">
                📊 {{ selectedPeriod }}일간 Fear & Greed Index 차트 (Chart.js 구현 예정)
                <br><br>
                <div class="text-caption">
                  현재 {{ historyData.length }}개의 데이터 포인트가 있습니다.
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Data Table -->
    <div v-if="!loading" class="row">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">상세 데이터</div>
            <q-table
              :rows="historyData"
              :columns="columns"
              row-key="date"
              :rows-per-page-options="[10, 25, 50]"
              class="history-table"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="row justify-center q-mt-lg">
      <q-banner class="text-negative" rounded>
        <template v-slot:avatar>
          <q-icon name="warning" />
        </template>
        {{ error }}
        <template v-slot:action>
          <q-btn flat label="재시도" @click="loadHistoryData" />
        </template>
      </q-banner>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { fearGreedApi, type HistoryData } from '@/api/investand/api'

const $q = useQuasar()

// 반응형 데이터
const loading = ref(true)
const error = ref('')
const selectedPeriod = ref(30)
const historyData = ref<HistoryData[]>([])

// 기간 옵션
const periodOptions = [
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
  { label: '180일', value: 180 }
]

// 테이블 컬럼 정의
const columns = computed(() => [
  {
    name: 'date',
    required: true,
    label: '날짜',
    align: 'left' as const,
    field: 'date',
    format: (val: string) => new Date(val).toLocaleDateString('ko-KR'),
    sortable: true
  },
  {
    name: 'value',
    required: true,
    label: 'Fear & Greed Index',
    align: 'center' as const,
    field: 'value',
    sortable: true
  },
  {
    name: 'level',
    required: true,
    label: '레벨',
    align: 'center' as const,
    field: (row: HistoryData) => getLevelFromValue(row.value),
    format: (val: string) => val
  }
])

// 메서드
function getLevelFromValue(value: number): string {
  if (value < 25) return 'Extreme Fear'
  if (value < 45) return 'Fear'
  if (value < 55) return 'Neutral'
  if (value < 75) return 'Greed'
  return 'Extreme Greed'
}

async function loadHistoryData(): Promise<void> {
  try {
    loading.value = true
    error.value = ''
    
    const data = await fearGreedApi.getHistoryData(selectedPeriod.value)
    historyData.value = data
    
  } catch (err) {
    error.value = '히스토리 데이터를 불러오는 중 오류가 발생했습니다.'
    console.error('Failed to load history data:', err)
    
    $q.notify({
      type: 'negative',
      message: '데이터 로딩 실패',
      caption: '잠시 후 다시 시도해주세요.',
      timeout: 3000,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}

// 라이프사이클
onMounted(() => {
  loadHistoryData()
})
</script>

<style lang="scss" scoped>
.chart-placeholder {
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 1.2rem;
  color: #666;
  text-align: center;
}

.history-table {
  .q-table__bottom {
    border-top: 1px solid #e0e0e0;
  }
}

@media (max-width: 768px) {
  .chart-placeholder {
    height: 300px;
    font-size: 1rem;
  }
}
</style> 


