<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Header -->
      <div class="col-12">
        <div class="text-h4 q-mb-md">DART 데이터 관리</div>
        <q-separator class="q-mb-lg" />
      </div>

      <!-- DART API Status -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">DART API 상태</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>상태</q-item-label>
                    <q-item-label>
                      <q-chip 
                        :color="dartStatus.isOperational ? 'positive' : 'negative'"
                        :label="dartStatus.isOperational ? '정상' : '오류'"
                        size="sm"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Rate Limit</q-item-label>
                    <q-item-label>{{ dartStatus.rateLimit || 'N/A' }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <q-btn 
              label="상태 새로고침" 
              color="primary" 
              @click="checkDartStatus"
              :loading="loadingStatus"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Batch Service Status -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">배치 서비스 상태</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>상태</q-item-label>
                    <q-item-label>
                      <q-chip 
                        :color="batchStatus.isRunning ? 'positive' : 'warning'"
                        :label="batchStatus.isRunning ? '실행중' : '대기중'"
                        size="sm"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>작업 수</q-item-label>
                    <q-item-label>{{ batchStatus.jobCount || 0 }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <q-btn 
              label="상태 새로고침" 
              color="primary" 
              @click="checkBatchStatus"
              :loading="loadingBatchStatus"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Daily Disclosure Collection -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">일별 공시 수집</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit="scheduleDailyCollection" class="q-gutter-md">
              <q-input
                v-model="dailyCollection.date"
                label="수집 날짜"
                type="date"
                :rules="[val => !!val || '날짜를 선택해주세요']"
                outlined
              />
              <q-checkbox v-model="dailyCollection.options.sentimentOnly" label="감정 관련 공시만 수집" />
              <q-btn
                label="배치 예약"
                type="submit"
                color="primary"
                :loading="loadingDaily"
                class="full-width"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Manual DART Batch Collection -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">수동 DART 배치 수집</div>
            <div class="text-caption text-grey-7">즉시 실행 및 데이터베이스 저장</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit="runManualBatchCollection" class="q-gutter-md">
              <q-input
                v-model="manualBatch.date"
                label="수집 날짜"
                type="date"
                :rules="[val => !!val || '날짜를 선택해주세요']"
                outlined
              />
              <q-input
                v-model.number="manualBatch.maxPages"
                label="최대 페이지 수"
                type="number"
                min="1"
                max="100"
                hint="1-100 페이지 (기본값: 50)"
                outlined
              />
              <q-input
                v-model.number="manualBatch.pageSize"
                label="페이지당 레코드 수"
                type="number"
                min="1"
                max="100"
                hint="1-100 레코드 (기본값: 100)"
                outlined
              />
              <q-btn
                label="즉시 수집 실행"
                type="submit"
                color="secondary"
                :loading="loadingManualBatch"
                class="full-width"
                icon="play_arrow"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Financial Data Collection -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">재무 데이터 수집</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit="scheduleFinancialCollection" class="q-gutter-md">
              <q-input
                v-model="financialCollection.businessYear"
                label="사업연도"
                type="number"
                min="2020"
                max="2030"
                :rules="[val => !!val || '사업연도를 입력해주세요']"
                outlined
              />
              <q-btn 
                label="배치 예약" 
                type="submit"
                color="primary"
                :loading="loadingFinancial"
                class="full-width"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- DART Statistics -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">DART 수집 통계</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>총 공시 수</q-item-label>
                    <q-item-label class="text-h5">{{ dartStats.totalDisclosures }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>감정 관련</q-item-label>
                    <q-item-label class="text-h5">{{ dartStats.sentimentRelevant }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>API 호출 수</q-item-label>
                    <q-item-label class="text-h5">{{ dartStats.apiCalls }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>성공률</q-item-label>
                    <q-item-label class="text-h5">{{ dartStats.successRate }}%</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <q-btn 
              label="통계 새로고침" 
              color="primary" 
              @click="loadDartStats"
              :loading="loadingStats"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Test Functions -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">테스트 기능</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-btn 
                  label="공시 수집 테스트" 
                  color="secondary"
                  @click="testDisclosures"
                  :loading="testingDisclosures"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-btn 
                  label="KOSPI 200 테스트" 
                  color="secondary"
                  @click="testKospi200"
                  :loading="testingKospi200"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-md-4">
                <q-btn 
                  label="필터 테스트" 
                  color="secondary"
                  @click="testFilter"
                  :loading="testingFilter"
                  class="full-width"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Notifications -->
    <q-dialog v-model="showNotification" persistent>
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">{{ notificationTitle }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          {{ notificationMessage }}
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="확인" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dartApi } from '@/services/dartApi'

// Reactive data
const dartStatus = ref({
  isOperational: false,
  rateLimit: '',
  timestamp: '',
  lastError: null
})

const batchStatus = ref({
  isRunning: false,
  jobCount: 0,
  lastJobId: '',
  lastUpdate: ''
})

const dartStats = ref({
  date: '',
  totalDisclosures: 0,
  sentimentRelevant: 0,
  apiCalls: 0,
  successRate: 0,
  averageResponseTime: 0
})

const dailyCollection = ref({
  date: new Date().toISOString().split('T')[0],
  options: {
    sentimentOnly: false
  }
})

const manualBatch = ref({
  date: new Date().toISOString().split('T')[0],
  maxPages: 50,
  pageSize: 100
})

const financialCollection = ref({
  businessYear: new Date().getFullYear().toString()
})

// Loading states
const loadingStatus = ref(false)
const loadingBatchStatus = ref(false)
const loadingStats = ref(false)
const loadingDaily = ref(false)
const loadingManualBatch = ref(false)
const loadingFinancial = ref(false)
const testingDisclosures = ref(false)
const testingKospi200 = ref(false)
const testingFilter = ref(false)

// Notifications
const showNotification = ref(false)
const notificationTitle = ref('')
const notificationMessage = ref('')

// Methods
const showSuccess = (title: string, message: string) => {
  notificationTitle.value = title
  notificationMessage.value = message
  showNotification.value = true
}

const showError = (title: string, message: string) => {
  notificationTitle.value = title
  notificationMessage.value = message
  showNotification.value = true
}

const checkDartStatus = async () => {
  loadingStatus.value = true
  try {
    const status = await dartApi.checkHealth()
    dartStatus.value = status
    showSuccess('성공', 'DART API 상태를 확인했습니다.')
  } catch (error) {
    showError('오류', 'DART API 상태 확인에 실패했습니다.')
  } finally {
    loadingStatus.value = false
  }
}

const checkBatchStatus = async () => {
  loadingBatchStatus.value = true
  try {
    const status = await dartApi.getBatchStatus()
    batchStatus.value = status
    showSuccess('성공', '배치 서비스 상태를 확인했습니다.')
  } catch (error) {
    showError('오류', '배치 서비스 상태 확인에 실패했습니다.')
  } finally {
    loadingBatchStatus.value = false
  }
}

const loadDartStats = async () => {
  loadingStats.value = true
  try {
    const stats = await dartApi.getStats()
    dartStats.value = stats
    showSuccess('성공', 'DART 통계를 로드했습니다.')
  } catch (error) {
    showError('오류', 'DART 통계 로드에 실패했습니다.')
  } finally {
    loadingStats.value = false
  }
}

const scheduleDailyCollection = async () => {
  loadingDaily.value = true
  try {
    const result = await dartApi.scheduleDailyBatch(dailyCollection.value.date, dailyCollection.value.options)
    showSuccess('성공', `일별 공시 수집이 예약되었습니다. (Job ID: ${result.jobId})`)
  } catch (error) {
    showError('오류', '일별 공시 수집 예약에 실패했습니다.')
  } finally {
    loadingDaily.value = false
  }
}

const runManualBatchCollection = async () => {
  loadingManualBatch.value = true
  try {
    const result = await dartApi.runManualBatch(
      manualBatch.value.date || new Date().toISOString().split('T')[0],
      manualBatch.value.maxPages,
      manualBatch.value.pageSize
    )
    showSuccess(
      '수집 완료',
      `총 ${result.totalDisclosures}건 수집, ${result.savedDisclosures}건 저장됨`
    )
    // Refresh stats after successful collection
    await loadDartStats()
  } catch (error) {
    showError('오류', '수동 DART 배치 수집에 실패했습니다.')
  } finally {
    loadingManualBatch.value = false
  }
}

const scheduleFinancialCollection = async () => {
  loadingFinancial.value = true
  try {
    const result = await dartApi.scheduleFinancialBatch(financialCollection.value.businessYear)
    showSuccess('성공', `재무 데이터 수집이 예약되었습니다. (Job ID: ${result.jobId})`)
  } catch (error) {
    showError('오류', '재무 데이터 수집 예약에 실패했습니다.')
  } finally {
    loadingFinancial.value = false
  }
}

const testDisclosures = async () => {
  testingDisclosures.value = true
  try {
    const result = await dartApi.testCollection('disclosures')
    showSuccess('테스트 성공', '공시 수집 테스트가 완료되었습니다.')
  } catch (error) {
    showError('테스트 실패', '공시 수집 테스트에 실패했습니다.')
  } finally {
    testingDisclosures.value = false
  }
}

const testKospi200 = async () => {
  testingKospi200.value = true
  try {
    const result = await dartApi.testCollection('kospi200')
    showSuccess('테스트 성공', 'KOSPI 200 테스트가 완료되었습니다.')
  } catch (error) {
    showError('테스트 실패', 'KOSPI 200 테스트에 실패했습니다.')
  } finally {
    testingKospi200.value = false
  }
}

const testFilter = async () => {
  testingFilter.value = true
  try {
    const result = await dartApi.testCollection('filter')
    showSuccess('테스트 성공', '필터 테스트가 완료되었습니다.')
  } catch (error) {
    showError('테스트 실패', '필터 테스트에 실패했습니다.')
  } finally {
    testingFilter.value = false
  }
}

// Lifecycle
onMounted(() => {
  checkDartStatus()
  checkBatchStatus()
  loadDartStats()
})
</script>
