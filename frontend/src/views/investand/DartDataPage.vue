<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Header -->
      <div class="col-12">
        <div class="text-h4 q-mb-md">DART 공시 데이터</div>
        <q-separator class="q-mb-lg" />
      </div>

      <!-- Search Filters -->
      <div class="col-12">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6">검색 조건</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.startDate"
                  label="시작 날짜"
                  type="date"
                  outlined
                  :rules="[val => !!val || '시작 날짜를 선택해주세요']"
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.endDate"
                  label="종료 날짜"
                  type="date"
                  outlined
                  :rules="[val => !!val || '종료 날짜를 선택해주세요']"
                />
              </div>
              <div class="col-12 col-md-2">
                <q-input
                  v-model="searchParams.corpCode"
                  label="기업 코드"
                  outlined
                  placeholder="예: 00126380"
                />
              </div>
              <div class="col-12 col-md-2">
                <q-select
                  v-model="searchParams.reportCode"
                  :options="reportCodeOptions"
                  label="보고서 유형"
                  outlined
                  clearable
                />
              </div>
              <div class="col-12 col-md-2">
                <q-checkbox v-model="searchParams.sentimentOnly" label="감정 관련만" />
              </div>
            </div>
            <div class="row q-col-gutter-md q-mt-md">
              <div class="col-12 col-md-2">
                <q-btn 
                  label="검색" 
                  color="primary" 
                  @click="searchDisclosures"
                  :loading="loading"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-md-2">
                <q-btn 
                  label="초기화" 
                  color="secondary" 
                  @click="resetSearch"
                  class="full-width"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Results Summary -->
      <div class="col-12" v-if="disclosures.length > 0">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>총 공시 수</q-item-label>
                    <q-item-label class="text-h5">{{ totalDisclosures }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>현재 페이지</q-item-label>
                    <q-item-label class="text-h5">{{ currentPage }} / {{ totalPages }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>페이지당 항목</q-item-label>
                    <q-item-label class="text-h5">{{ pageSize }}</q-item-label>
                  </q-item-section>
                </q-item>
              </div>
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>검색 조건</q-item-label>
                    <q-item-label class="text-caption">
                      {{ searchParams.startDate }} ~ {{ searchParams.endDate }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Disclosures List -->
      <div class="col-12" v-if="disclosures.length > 0">
        <q-card>
          <q-card-section>
            <div class="text-h6">공시 목록</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div 
                v-for="disclosure in disclosures" 
                :key="disclosure.receiptNumber"
                class="col-12 col-md-6 col-lg-4"
              >
                <q-card flat bordered class="q-mb-md">
                  <q-card-section>
                    <div class="row q-col-gutter-sm">
                      <div class="col-12">
                        <div class="text-subtitle2 text-weight-bold">{{ disclosure.corpName }}</div>
                        <div class="text-caption text-grey-6">{{ disclosure.stockCode }}</div>
                      </div>
                      <div class="col-12 q-mt-sm">
                        <div class="text-body2">{{ disclosure.reportName }}</div>
                        <div class="text-caption text-grey-6">
                          접수번호: {{ disclosure.receiptNumber }}
                        </div>
                      </div>
                      <div class="col-12 q-mt-sm">
                        <div class="row q-col-gutter-xs">
                          <div class="col-6">
                            <q-chip 
                              :color="getReportCodeColor(disclosure.reportCode)"
                              :label="getReportCodeLabel(disclosure.reportCode)"
                              size="sm"
                            />
                          </div>
                          <div class="col-6">
                            <q-chip 
                              color="grey"
                              :label="formatDate(disclosure.disclosureDate)"
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="col-12 q-mt-sm" v-if="disclosure.remarks">
                        <div class="text-caption text-grey-7">
                          비고: {{ disclosure.remarks }}
                        </div>
                      </div>
                    </div>
                  </q-card-section>
                  <q-card-actions align="right">
                    <q-btn 
                      flat 
                      color="primary" 
                      label="상세보기"
                      size="sm"
                      @click="viewDisclosureDetail(disclosure)"
                    />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Pagination -->
      <div class="col-12" v-if="totalPages > 1">
        <q-card>
          <q-card-section class="q-pa-sm">
            <div class="row justify-center">
              <q-pagination
                v-model="currentPage"
                :max="totalPages"
                :max-pages="6"
                boundary-numbers
                direction-links
                @update:model-value="onPageChange"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- No Results -->
      <div class="col-12" v-if="!loading && disclosures.length === 0 && hasSearched">
        <q-card>
          <q-card-section class="text-center q-pa-xl">
            <q-icon name="search_off" size="4rem" color="grey-4" />
            <div class="text-h6 q-mt-md text-grey-6">검색 결과가 없습니다</div>
            <div class="text-caption text-grey-5 q-mt-sm">
              검색 조건을 변경해보세요
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Disclosure Detail Dialog -->
    <q-dialog v-model="showDetailDialog" maximized>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">공시 상세 정보</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedDisclosure">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>기업명</q-item-label>
                  <q-item-label>{{ selectedDisclosure.corpName }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>종목코드</q-item-label>
                  <q-item-label>{{ selectedDisclosure.stockCode }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12">
              <q-item>
                <q-item-section>
                  <q-item-label caption>보고서명</q-item-label>
                  <q-item-label>{{ selectedDisclosure.reportName }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>접수번호</q-item-label>
                  <q-item-label>{{ selectedDisclosure.receiptNumber }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>제출인</q-item-label>
                  <q-item-label>{{ selectedDisclosure.flrName }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>접수일자</q-item-label>
                  <q-item-label>{{ formatDate(selectedDisclosure.receiptDate) }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>공시일자</q-item-label>
                  <q-item-label>{{ formatDate(selectedDisclosure.disclosureDate) }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12" v-if="selectedDisclosure.remarks">
              <q-item>
                <q-item-section>
                  <q-item-label caption>비고</q-item-label>
                  <q-item-label>{{ selectedDisclosure.remarks }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="닫기" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { dartApi, type DartDisclosure } from '@/api/investand/dartApi'

// Reactive data
const searchParams = ref({
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  corpCode: '',
  reportCode: '',
  sentimentOnly: false,
  page: 1,
  limit: 50
})

const disclosures = ref<DartDisclosure[]>([])
const totalDisclosures = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(1)
const loading = ref(false)
const hasSearched = ref(false)
const showDetailDialog = ref(false)
const selectedDisclosure = ref<DartDisclosure | null>(null)

// Report code options
const reportCodeOptions = [
  { label: '정기공시', value: 'A' },
  { label: '주요사항보고서', value: 'B' },
  { label: '발행공시', value: 'C' },
  { label: '지배구조', value: 'D' },
  { label: '공정거래', value: 'E' }
]

// Methods
const searchDisclosures = async () => {
  loading.value = true
  hasSearched.value = true
  
  try {
    const response = await dartApi.getDisclosures({
      startDate: searchParams.value.startDate,
      endDate: searchParams.value.endDate,
      corpCode: searchParams.value.corpCode || undefined,
      reportCode: searchParams.value.reportCode || undefined,
      sentimentOnly: searchParams.value.sentimentOnly,
      page: currentPage.value,
      limit: pageSize.value
    })
    
    disclosures.value = response.disclosures
    totalDisclosures.value = response.total
    totalPages.value = Math.ceil(response.total / pageSize.value)
  } catch (error) {
    console.error('DART disclosures search failed:', error)
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchParams.value = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    corpCode: '',
    reportCode: '',
    sentimentOnly: false,
    page: 1,
    limit: 50
  }
  currentPage.value = 1
  disclosures.value = []
  totalDisclosures.value = 0
  totalPages.value = 1
  hasSearched.value = false
}

const onPageChange = (page: number) => {
  currentPage.value = page
  searchParams.value.page = page
  searchDisclosures()
}

const viewDisclosureDetail = (disclosure: DartDisclosure) => {
  selectedDisclosure.value = disclosure
  showDetailDialog.value = true
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const year = dateString.substring(0, 4)
  const month = dateString.substring(4, 6)
  const day = dateString.substring(6, 8)
  return `${year}-${month}-${day}`
}

const getReportCodeColor = (code: string) => {
  switch (code) {
    case 'A': return 'blue'
    case 'B': return 'green'
    case 'C': return 'orange'
    case 'D': return 'purple'
    case 'E': return 'red'
    default: return 'grey'
  }
}

const getReportCodeLabel = (code: string) => {
  const option = reportCodeOptions.find(opt => opt.value === code)
  return option ? option.label : code
}

// Lifecycle
onMounted(() => {
  // Initial search with default parameters
  searchDisclosures()
})
</script>



