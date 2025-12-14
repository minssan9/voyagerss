<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="q-ma-none text-weight-bold">관리자 대시보드</h4>
        <p class="text-grey-7 q-ma-none">시스템 상태 및 주요 지표를 확인하세요</p>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="refresh"
          label="새로고침"
          @click="refreshAllData"
          :loading="loading"
        />
      </div>
    </div>

    <!-- System Health Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="health-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">데이터베이스</div>
                <div class="text-caption text-grey-7">응답시간: {{ systemHealth.database.responseTime }}ms</div>
              </div>
              <div class="col-auto">
                <q-icon
                  :name="getHealthIcon(systemHealth.database.status)"
                  :color="getHealthColor(systemHealth.database.status)"
                  size="2rem"
                />
              </div>
            </div>
            <div class="q-mt-sm">
              <q-badge
                :color="getHealthColor(systemHealth.database.status)"
                :label="systemHealth.database.status"
              />
              <span class="q-ml-sm text-caption">
                연결: {{ systemHealth.database.connections }}
              </span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="health-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">API 서버</div>
                <div class="text-caption text-grey-7">업타임: {{ systemHealth.api.uptime }}</div>
              </div>
              <div class="col-auto">
                <q-icon
                  :name="getHealthIcon(systemHealth.api.status)"
                  :color="getHealthColor(systemHealth.api.status)"
                  size="2rem"
                />
              </div>
            </div>
            <div class="q-mt-sm">
              <q-badge
                :color="getHealthColor(systemHealth.api.status)"
                :label="systemHealth.api.status"
              />
              <span class="q-ml-sm text-caption">
                응답: {{ systemHealth.api.responseTime }}ms
              </span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-4">
        <q-card class="health-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">데이터 수집</div>
                <div class="text-caption text-grey-7">성공률: {{ systemHealth.dataCollection.successRate }}%</div>
              </div>
              <div class="col-auto">
                <q-icon
                  :name="getHealthIcon(systemHealth.dataCollection.status)"
                  :color="getHealthColor(systemHealth.dataCollection.status)"
                  size="2rem"
                />
              </div>
            </div>
            <div class="q-mt-sm">
              <q-badge
                :color="getHealthColor(systemHealth.dataCollection.status)"
                :label="systemHealth.dataCollection.status"
              />
              <span class="q-ml-sm text-caption">
                마지막: {{ formatLastRun(systemHealth.dataCollection.lastRun) }}
              </span>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Performance Metrics -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-8">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">시스템 성능</div>
            <div class="row q-gutter-md">
              <div class="col">
                <div class="text-caption text-grey-7">CPU 사용률</div>
                <q-linear-progress
                  :value="performanceMetrics.cpu / 100"
                  color="blue"
                  size="md"
                  class="q-mt-xs"
                />
                <div class="text-caption q-mt-xs">{{ performanceMetrics.cpu }}%</div>
              </div>
              <div class="col">
                <div class="text-caption text-grey-7">메모리 사용률</div>
                <q-linear-progress
                  :value="performanceMetrics.memory / 100"
                  color="orange"
                  size="md"
                  class="q-mt-xs"
                />
                <div class="text-caption q-mt-xs">{{ performanceMetrics.memory }}%</div>
              </div>
              <div class="col">
                <div class="text-caption text-grey-7">디스크 사용률</div>
                <q-linear-progress
                  :value="performanceMetrics.diskUsage / 100"
                  color="green"
                  size="md"
                  class="q-mt-xs"
                />
                <div class="text-caption q-mt-xs">{{ performanceMetrics.diskUsage }}%</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">네트워크 I/O</div>
            <div class="row q-gutter-sm">
              <div class="col-12">
                <div class="row items-center">
                  <q-icon name="download" color="blue" class="q-mr-sm" />
                  <div class="col">
                    <div class="text-caption text-grey-7">인바운드</div>
                    <div class="text-body1">{{ formatBytes(performanceMetrics.networkIO.inbound) }}/s</div>
                  </div>
                </div>
              </div>
              <div class="col-12">
                <div class="row items-center">
                  <q-icon name="upload" color="orange" class="q-mr-sm" />
                  <div class="col">
                    <div class="text-caption text-grey-7">아웃바운드</div>
                    <div class="text-body1">{{ formatBytes(performanceMetrics.networkIO.outbound) }}/s</div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">빠른 작업</div>
            <div class="row q-gutter-sm">
              <q-btn
                color="primary"
                icon="cloud_download"
                label="데이터 수집"
                @click="triggerDataCollection"
                :loading="collectingData"
              />
              <q-btn
                color="secondary"
                icon="calculate"
                label="지수 계산"
                @click="triggerIndexCalculation"
                :loading="calculatingIndex"
              />
              <q-btn
                color="positive"
                icon="cached"
                label="캐시 삭제"
                @click="clearSystemCache"
                :loading="clearingCache"
              />
              <q-btn
                color="warning"
                icon="restart_alt"
                label="서비스 재시작"
                @click="showRestartDialog"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Collection Logs -->
    <div class="row">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">최근 데이터 수집 로그</div>
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  icon="refresh"
                  @click="loadCollectionLogs"
                  :loading="loadingLogs"
                />
              </div>
            </div>

            <q-table
              :rows="collectionLogs"
              :columns="logColumns"
              :loading="loadingLogs"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="props.value === 'SUCCESS' ? 'positive' : 'negative'"
                    :label="props.value"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-createdAt="props">
                <q-td :props="props">
                  {{ formatDateTime(props.value) }}
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { adminApi, type SystemHealth, type PerformanceMetrics } from '../../services/adminApi'

const $q = useQuasar()

// Reactive data
const loading = ref(false)
const loadingLogs = ref(false)
const collectingData = ref(false)
const calculatingIndex = ref(false)
const clearingCache = ref(false)

const systemHealth = ref<SystemHealth>({
  database: { status: 'HEALTHY', responseTime: 0, connections: 0 },
  api: { status: 'HEALTHY', responseTime: 0, uptime: '' },
  dataCollection: { lastRun: '', status: 'IDLE', successRate: 0 }
})

const performanceMetrics = ref<PerformanceMetrics>({
  cpu: 0,
  memory: 0,
  diskUsage: 0,
  networkIO: { inbound: 0, outbound: 0 }
})

const collectionLogs = ref<any[]>([])

let metricsInterval: NodeJS.Timeout

// Table columns
const logColumns = [
  { name: 'date', label: '날짜', field: 'date', align: 'left' },
  { name: 'source', label: '소스', field: 'source', align: 'left' },
  { name: 'dataType', label: '데이터 타입', field: 'dataType', align: 'left' },
  { name: 'status', label: '상태', field: 'status', align: 'center' },
  { name: 'recordCount', label: '레코드 수', field: 'recordCount', align: 'right' },
  { name: 'createdAt', label: '생성시간', field: 'createdAt', align: 'left' }
]

// Methods
function getHealthIcon(status: string): string {
  switch (status) {
    case 'HEALTHY': return 'check_circle'
    case 'WARNING': return 'warning'
    case 'ERROR': return 'error'
    default: return 'help'
  }
}

function getHealthColor(status: string): string {
  switch (status) {
    case 'HEALTHY': return 'positive'
    case 'WARNING': return 'warning'
    case 'ERROR': return 'negative'
    default: return 'grey'
  }
}

function formatLastRun(lastRun: string): string {
  if (!lastRun) return 'N/A'
  return format(new Date(lastRun), 'MM/dd HH:mm', { locale: ko })
}

function formatDateTime(dateTime: string): string {
  return format(new Date(dateTime), 'yyyy-MM-dd HH:mm:ss', { locale: ko })
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${sizes[i]}`
}

async function loadSystemHealth(): Promise<void> {
  try {
    const health = await adminApi.getSystemHealth()
    systemHealth.value = health
  } catch (error) {
    console.error('Failed to load system health:', error)
  }
}

async function loadPerformanceMetrics(): Promise<void> {
  try {
    const metrics = await adminApi.getPerformanceMetrics()
    performanceMetrics.value = metrics
  } catch (error) {
    console.error('Failed to load performance metrics:', error)
  }
}

async function loadCollectionLogs(): Promise<void> {
  loadingLogs.value = true
  try {
    const logs = await adminApi.getCollectionStatus(7)
    collectionLogs.value = logs
  } catch (error) {
    console.error('Failed to load collection logs:', error)
    $q.notify({ type: 'negative', message: '로그 조회에 실패했습니다.' })
  } finally {
    loadingLogs.value = false
  }
}

async function refreshAllData(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      loadSystemHealth(),
      loadPerformanceMetrics(),
      loadCollectionLogs()
    ])
    $q.notify({ type: 'positive', message: '데이터가 업데이트되었습니다.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: '데이터 새로고침에 실패했습니다.' })
  } finally {
    loading.value = false
  }
}

async function triggerDataCollection(): Promise<void> {
  collectingData.value = true
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    await adminApi.collectData({
      date: today,
      sources: ['KRX', 'BOK']
    })
    $q.notify({ type: 'positive', message: '데이터 수집이 시작되었습니다.' })
    await loadCollectionLogs()
  } catch (error) {
    $q.notify({ type: 'negative', message: '데이터 수집에 실패했습니다.' })
  } finally {
    collectingData.value = false
  }
}

async function triggerIndexCalculation(): Promise<void> {
  calculatingIndex.value = true
  try {
    const today = format(new Date(), 'yyyy-MM-dd')
    await adminApi.calculateIndex({ date: today })
    $q.notify({ type: 'positive', message: 'Fear & Greed Index가 계산되었습니다.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: '지수 계산에 실패했습니다.' })
  } finally {
    calculatingIndex.value = false
  }
}

async function clearSystemCache(): Promise<void> {
  clearingCache.value = true
  try {
    await adminApi.clearCache()
    $q.notify({ type: 'positive', message: '시스템 캐시가 삭제되었습니다.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: '캐시 삭제에 실패했습니다.' })
  } finally {
    clearingCache.value = false
  }
}

function showRestartDialog(): void {
  $q.dialog({
    title: '서비스 재시작',
    message: '어떤 서비스를 재시작하시겠습니까?',
    options: {
      type: 'radio',
      model: 'api',
      items: [
        { label: 'API 서버', value: 'api' },
        { label: '데이터 수집기', value: 'collector' },
        { label: '전체 시스템', value: 'all' }
      ]
    },
    cancel: true,
    persistent: true
  }).onOk(async (service) => {
    try {
      await adminApi.restartService(service)
      $q.notify({ type: 'positive', message: `${service} 서비스가 재시작되었습니다.` })
    } catch (error) {
      $q.notify({ type: 'negative', message: '서비스 재시작에 실패했습니다.' })
    }
  })
}

// Lifecycle
onMounted(() => {
  refreshAllData()
  
  // 성능 메트릭을 30초마다 업데이트
  metricsInterval = setInterval(() => {
    loadPerformanceMetrics()
  }, 30000)
})

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval)
  }
})
</script>

<style lang="scss" scoped>
.health-card {
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
}

.q-linear-progress {
  border-radius: 4px;
}

.q-table {
  .q-td {
    border-bottom: 1px solid #e0e0e0;
  }
}
</style>