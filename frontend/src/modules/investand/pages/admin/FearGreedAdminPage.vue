<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Header -->
      <div class="col-12">
        <div class="text-h4 q-mb-md">Fear & Greed Index 관리</div>
        <q-separator class="q-mb-lg" />
      </div>

      <!-- Current Index Status -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">현재 Fear & Greed Index</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>현재 값</q-item-label>
                    <q-item-label class="text-h4">{{ currentIndex.value }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>레벨</q-item-label>
                    <q-item-label>
                      <q-chip 
                        :color="getLevelColor(currentIndex.level)"
                        :label="currentIndex.level"
                        size="md"
                      />
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <div class="row q-col-gutter-sm q-mt-md">
              <div class="col-12">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>날짜</q-item-label>
                    <q-item-label>{{ currentIndex.date }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <q-btn 
              label="새로고침" 
              color="primary" 
              @click="loadCurrentIndex"
              :loading="loadingCurrent"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Index Components -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">구성 요소</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>가격 모멘텀</q-item-label>
                    <q-item-label class="text-h6">{{ currentIndex.components.priceMomentum }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>투자자 심리</q-item-label>
                    <q-item-label class="text-h6">{{ currentIndex.components.investorSentiment }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Put/Call 비율</q-item-label>
                    <q-item-label class="text-h6">{{ currentIndex.components.putCallRatio }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>변동성 지수</q-item-label>
                    <q-item-label class="text-h6">{{ currentIndex.components.volatilityIndex }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-6">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>안전자산 수요</q-item-label>
                    <q-item-label class="text-h6">{{ currentIndex.components.safeHavenDemand }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Manual Index Calculation -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">수동 Index 계산</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit="calculateIndex" class="q-gutter-md">
              <q-input
                v-model="manualCalculation.date"
                label="계산 날짜"
                type="date"
                :rules="[val => !!val || '날짜를 선택해주세요']"
                outlined
              />
              <q-btn 
                label="Index 계산" 
                type="submit"
                color="primary"
                :loading="loadingCalculation"
                class="full-width"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Range Recalculation -->
      <div class="col-12 col-md-6">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">범위 재계산</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit="recalculateRange" class="q-gutter-md">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <q-input
                    v-model="rangeRecalculation.startDate"
                    label="시작 날짜"
                    type="date"
                    :rules="[val => !!val || '시작 날짜를 선택해주세요']"
                    outlined
                  />
                </div>
                <div class="col-6">
                  <q-input
                    v-model="rangeRecalculation.endDate"
                    label="종료 날짜"
                    type="date"
                    :rules="[val => !!val || '종료 날짜를 선택해주세요']"
                    outlined
                  />
                </div>
              </div>
              <q-btn 
                label="범위 재계산" 
                type="submit"
                color="secondary"
                :loading="loadingRangeRecalculation"
                class="full-width"
              />
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <!-- Index Statistics -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">Index 통계</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Extreme Fear</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.distribution.extremeFear }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Fear</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.distribution.fear }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Neutral</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.distribution.neutral }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Greed</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.distribution.greed }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Extreme Greed</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.distribution.extremeGreed }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-2">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>평균 Index</q-item-label>
                    <q-item-label class="text-h5">{{ indexStats.averageIndex }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
            <q-btn 
              label="통계 새로고침" 
              color="primary" 
              @click="loadIndexStats"
              :loading="loadingStats"
              class="q-mt-sm"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- History Chart -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">Index 히스토리</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-input
                  v-model="historyDays"
                  label="조회 기간 (일)"
                  type="number"
                  min="7"
                  max="365"
                  outlined
                />
              </div>
              <div class="col-12 col-md-3">
                <q-btn 
                  label="히스토리 조회" 
                  color="primary" 
                  @click="loadHistory"
                  :loading="loadingHistory"
                />
              </div>
            </div>
            <div class="q-mt-md">
              <div v-if="indexHistory.length > 0" class="text-body2">
                <div class="row q-col-gutter-sm">
                  <div 
                    v-for="item in indexHistory.slice(0, 10)" 
                    :key="item.date"
                    class="col-12 col-md-2"
                  >
                    <q-card flat bordered>
                      <q-card-section class="q-pa-sm">
                        <div class="text-caption">{{ item.date }}</div>
                        <div class="text-h6">{{ item.value }}</div>
                        <q-chip 
                          :color="getLevelColor(item.level)"
                          :label="item.level"
                          size="xs"
                        />
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
              <div v-else class="text-grey-6 text-center q-pa-md">
                히스토리 데이터가 없습니다.
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Specific Date Lookup -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">특정 날짜 조회</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="specificDate.date"
                  label="조회 날짜"
                  type="date"
                  outlined
                />
              </div>
              <div class="col-12 col-md-4">
                <q-btn 
                  label="조회" 
                  color="primary" 
                  @click="lookupSpecificDate"
                  :loading="loadingSpecificDate"
                />
              </div>
            </div>
            <div v-if="specificDateResult" class="q-mt-md">
              <q-card flat bordered>
                <q-card-section>
                  <div class="row q-col-gutter-sm">
                    <div class="col-4">
                      <div class="text-caption">날짜</div>
                      <div class="text-h6">{{ specificDateResult.date }}</div>
                    </div>
                    <div class="col-4">
                      <div class="text-caption">Index 값</div>
                      <div class="text-h6">{{ specificDateResult.value }}</div>
                    </div>
                    <div class="col-4">
                      <div class="text-caption">레벨</div>
                      <q-chip 
                        :color="getLevelColor(specificDateResult.level)"
                        :label="specificDateResult.level"
                        size="md"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
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
import { fearGreedApi } from '@/services/fearGreedApi'

// Reactive data
const currentIndex = ref({
  value: 0,
  level: 'Neutral',
  date: '',
  components: {
    priceMomentum: 0,
    investorSentiment: 0,
    putCallRatio: 0,
    volatilityIndex: 0,
    safeHavenDemand: 0
  }
})

const indexStats = ref({
  distribution: {
    extremeFear: 0,
    fear: 0,
    neutral: 0,
    greed: 0,
    extremeGreed: 0
  },
  total: 0,
  averageIndex: 0,
  lastUpdated: ''
})

const indexHistory = ref<Array<{
  date: string
  value: number
  level: string
}>>([])

const specificDateResult = ref<{
  date: string
  value: number
  level: string
} | null>(null)

const manualCalculation = ref({
  date: new Date().toISOString().split('T')[0]
})

const rangeRecalculation = ref({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0]
})

const specificDate = ref({
  date: new Date().toISOString().split('T')[0]
})

const historyDays = ref(30)

// Loading states
const loadingCurrent = ref(false)
const loadingStats = ref(false)
const loadingHistory = ref(false)
const loadingCalculation = ref(false)
const loadingRangeRecalculation = ref(false)
const loadingSpecificDate = ref(false)

// Notifications
const showNotification = ref(false)
const notificationTitle = ref('')
const notificationMessage = ref('')

// Methods
const getLevelColor = (level: string) => {
  switch (level) {
    case 'Extreme Fear': return 'deep-purple'
    case 'Fear': return 'purple'
    case 'Neutral': return 'grey'
    case 'Greed': return 'orange'
    case 'Extreme Greed': return 'red'
    default: return 'grey'
  }
}

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

const loadCurrentIndex = async () => {
  loadingCurrent.value = true
  try {
    const index = await fearGreedApi.getCurrentIndex()
    currentIndex.value = index
    showSuccess('성공', '현재 Fear & Greed Index를 로드했습니다.')
  } catch (error) {
    showError('오류', '현재 Index 로드에 실패했습니다.')
  } finally {
    loadingCurrent.value = false
  }
}

const loadIndexStats = async () => {
  loadingStats.value = true
  try {
    const stats = await fearGreedApi.getStats()
    indexStats.value = stats
    showSuccess('성공', 'Index 통계를 로드했습니다.')
  } catch (error) {
    showError('오류', 'Index 통계 로드에 실패했습니다.')
  } finally {
    loadingStats.value = false
  }
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    const history = await fearGreedApi.getHistory(historyDays.value)
    indexHistory.value = history
    showSuccess('성공', 'Index 히스토리를 로드했습니다.')
  } catch (error) {
    showError('오류', 'Index 히스토리 로드에 실패했습니다.')
  } finally {
    loadingHistory.value = false
  }
}

const calculateIndex = async () => {
  loadingCalculation.value = true
  try {
    const result = await fearGreedApi.calculateIndex(manualCalculation.value.date)
    showSuccess('성공', `${manualCalculation.value.date}의 Index 계산이 완료되었습니다.`)
    // Refresh current index after calculation
    await loadCurrentIndex()
  } catch (error) {
    showError('오류', 'Index 계산에 실패했습니다.')
  } finally {
    loadingCalculation.value = false
  }
}

const recalculateRange = async () => {
  loadingRangeRecalculation.value = true
  try {
    const results = await fearGreedApi.recalculateRange(
      rangeRecalculation.value.startDate,
      rangeRecalculation.value.endDate
    )
    showSuccess('성공', `${results.length}일의 Index 재계산이 완료되었습니다.`)
    // Refresh data after recalculation
    await loadCurrentIndex()
    await loadIndexStats()
  } catch (error) {
    showError('오류', '범위 재계산에 실패했습니다.')
  } finally {
    loadingRangeRecalculation.value = false
  }
}

const lookupSpecificDate = async () => {
  loadingSpecificDate.value = true
  try {
    const result = await fearGreedApi.getIndexByDate(specificDate.value.date)
    specificDateResult.value = result
    showSuccess('성공', '특정 날짜 Index를 조회했습니다.')
  } catch (error) {
    showError('오류', '특정 날짜 Index 조회에 실패했습니다.')
  } finally {
    loadingSpecificDate.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadCurrentIndex()
  loadIndexStats()
  loadHistory()
})
</script>
