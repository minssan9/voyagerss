<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <!-- Header -->
      <div class="col-12">
        <div class="text-h4 q-mb-md">DART 주식 보유현황 관리</div>
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
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.corpName"
                  label="기업명"
                  outlined
                  placeholder="예: 삼성전자"
                  clearable
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.changeReason"
                  label="변동 사유"
                  outlined
                  placeholder="예: 장내매수로 인한 지분증가"
                  clearable
                />
              </div>
            </div>
            <div class="row q-col-gutter-md q-mt-md">
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.corpCode"
                  label="기업 코드"
                  outlined
                  placeholder="예: 00126380"
                  clearable
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="searchParams.reporterName"
                  label="보고자명"
                  outlined
                  placeholder="보고자명 검색"
                  clearable
                />
              </div>
              <div class="col-12 col-md-6">
                <div class="row q-col-gutter-sm">
                  <div class="col-auto">
                    <q-btn
                      label="검색"
                      color="primary"
                      icon="search"
                      @click="searchHoldings"
                      :loading="loading"
                      :disable="!searchParams.startDate || !searchParams.endDate"
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      label="초기화"
                      color="grey"
                      outline
                      @click="resetSearch"
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      label="Excel 내보내기"
                      color="positive"
                      outline
                      icon="download"
                      @click="exportToExcel"
                      :disable="holdings.length === 0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Statistics -->
      <div class="col-12" v-if="hasSearched">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-3">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>총 건수</q-item-label>
                    <q-item-label class="text-h5">{{ totalHoldings }}</q-item-label>
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
                    <q-item-label caption>검색 기간</q-item-label>
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

      <!-- Holdings Table -->
      <div class="col-12" v-if="holdings.length > 0">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">주식 보유현황 목록</div>
            <q-table
              :rows="holdings"
              :columns="columns"
              row-key="id"
              :rows-per-page-options="[10, 25, 50, 100]"
              :pagination="{ rowsPerPage: pageSize, page: currentPage }"
              @update:pagination="onPaginationUpdate"
              :loading="loading"
              class="holdings-table"
            >
              <template v-slot:body-cell-holdingRatio="props">
                <q-td :props="props">
                  <span v-if="props.value">{{ parseFloat(props.value).toFixed(2) }}%</span>
                  <span v-else class="text-grey">-</span>
                </q-td>
              </template>
              <template v-slot:body-cell-changeRatio="props">
                <q-td :props="props">
                  <span 
                    v-if="props.value" 
                    :class="parseFloat(props.value) > 0 ? 'text-positive' : parseFloat(props.value) < 0 ? 'text-negative' : ''"
                  >
                    {{ parseFloat(props.value) > 0 ? '+' : '' }}{{ parseFloat(props.value).toFixed(2) }}%
                  </span>
                  <span v-else class="text-grey">-</span>
                </q-td>
              </template>
              <template v-slot:body-cell-changeReason="props">
                <q-td :props="props">
                  <div class="text-caption" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ props.value || props.row.reportReason || '-' }}
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    round
                    icon="visibility"
                    color="primary"
                    @click="viewDetail(props.row)"
                  >
                    <q-tooltip>상세보기</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <!-- Empty State -->
      <div class="col-12" v-if="hasSearched && holdings.length === 0 && !loading">
        <q-card>
          <q-card-section class="text-center q-pa-xl">
            <q-icon name="inbox" size="64px" color="grey-5" />
            <div class="text-h6 q-mt-md text-grey-7">검색 결과가 없습니다</div>
            <div class="text-caption text-grey-6 q-mt-sm">
              다른 검색 조건으로 다시 시도해주세요
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Detail Dialog -->
    <q-dialog v-model="showDetailDialog" maximized>
      <q-card v-if="selectedHolding">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">주식 보유현황 상세</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>기업명</q-item-label>
                  <q-item-label>{{ selectedHolding.corpName }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>기업 코드</q-item-label>
                  <q-item-label>{{ selectedHolding.corpCode }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>주식 코드</q-item-label>
                  <q-item-label>{{ selectedHolding.stockCode || '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>보고자명</q-item-label>
                  <q-item-label>{{ selectedHolding.reporterName }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>접수일자</q-item-label>
                  <q-item-label>{{ formatDate(selectedHolding.receiptDate) || '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>보고일자</q-item-label>
                  <q-item-label>{{ formatDate(selectedHolding.reportDate) || '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>보유 주식 수</q-item-label>
                  <q-item-label>{{ selectedHolding.holdingShares ? Number(selectedHolding.holdingShares).toLocaleString() : '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>변동 주식 수</q-item-label>
                  <q-item-label>
                    <span :class="selectedHolding.changeShares && parseFloat(selectedHolding.changeShares) > 0 ? 'text-positive' : selectedHolding.changeShares && parseFloat(selectedHolding.changeShares) < 0 ? 'text-negative' : ''">
                      {{ selectedHolding.changeShares ? (parseFloat(selectedHolding.changeShares) > 0 ? '+' : '') + Number(selectedHolding.changeShares).toLocaleString() : '-' }}
                    </span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>보유 비율</q-item-label>
                  <q-item-label>{{ selectedHolding.holdingRatio ? parseFloat(selectedHolding.holdingRatio).toFixed(2) + '%' : '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12 col-md-6">
              <q-item>
                <q-item-section>
                  <q-item-label caption>변동 비율</q-item-label>
                  <q-item-label>
                    <span :class="selectedHolding.changeRatio && parseFloat(selectedHolding.changeRatio) > 0 ? 'text-positive' : selectedHolding.changeRatio && parseFloat(selectedHolding.changeRatio) < 0 ? 'text-negative' : ''">
                      {{ selectedHolding.changeRatio ? (parseFloat(selectedHolding.changeRatio) > 0 ? '+' : '') + parseFloat(selectedHolding.changeRatio).toFixed(2) + '%' : '-' }}
                    </span>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12">
              <q-item>
                <q-item-section>
                  <q-item-label caption>변동 사유</q-item-label>
                  <q-item-label class="text-body2">{{ selectedHolding.changeReason || selectedHolding.reportReason || '-' }}</q-item-label>
                </q-item-section>
              </q-item>
            </div>
            <div class="col-12" v-if="selectedHolding.receiptNumber">
              <q-item>
                <q-item-section>
                  <q-item-label caption>접수번호</q-item-label>
                  <q-item-label>{{ selectedHolding.receiptNumber }}</q-item-label>
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
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { dartApi, type DartStockHolding } from '@/services/dartApi'

const $q = useQuasar()

// Reactive data
const searchParams = ref({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  corpName: '',
  corpCode: '',
  reporterName: '',
  changeReason: ''
})

const holdings = ref<DartStockHolding[]>([])
const totalHoldings = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const totalPages = ref(1)
const loading = ref(false)
const hasSearched = ref(false)
const showDetailDialog = ref(false)
const selectedHolding = ref<DartStockHolding | null>(null)

// Table columns
const columns = [
  {
    name: 'corpName',
    required: true,
    label: '기업명',
    align: 'left' as const,
    field: 'corpName',
    sortable: true
  },
  {
    name: 'stockCode',
    label: '주식코드',
    align: 'center' as const,
    field: 'stockCode',
    sortable: true
  },
  {
    name: 'reporterName',
    label: '보고자명',
    align: 'left' as const,
    field: 'reporterName',
    sortable: true
  },
  {
    name: 'receiptDate',
    label: '접수일자',
    align: 'center' as const,
    field: 'receiptDate',
    format: (val: string) => val ? formatDate(val) : '-',
    sortable: true
  },
  {
    name: 'holdingRatio',
    label: '보유비율',
    align: 'right' as const,
    field: 'holdingRatio',
    sortable: true
  },
  {
    name: 'changeRatio',
    label: '변동비율',
    align: 'right' as const,
    field: 'changeRatio',
    sortable: true
  },
  {
    name: 'changeReason',
    label: '변동사유',
    align: 'left' as const,
    field: 'changeReason'
  },
  {
    name: 'actions',
    label: '작업',
    align: 'center' as const,
    field: 'actions'
  }
]

// Methods
const searchHoldings = async () => {
  if (!searchParams.value.startDate || !searchParams.value.endDate) {
    $q.notify({
      type: 'negative',
      message: '시작 날짜와 종료 날짜를 선택해주세요.'
    })
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const params: {
      startDate: string
      endDate: string
      corpName?: string
      corpCode?: string
      reporterName?: string
      changeReason?: string
      page: number
      limit: number
    } = {
      startDate: searchParams.value.startDate,
      endDate: searchParams.value.endDate,
      page: currentPage.value,
      limit: pageSize.value
    }

    if (searchParams.value.corpName) params.corpName = searchParams.value.corpName
    if (searchParams.value.corpCode) params.corpCode = searchParams.value.corpCode
    if (searchParams.value.reporterName) params.reporterName = searchParams.value.reporterName
    if (searchParams.value.changeReason) params.changeReason = searchParams.value.changeReason

    const response = await dartApi.getStockHoldings(params)

    holdings.value = response.holdings
    totalHoldings.value = response.total
    totalPages.value = response.totalPages
    currentPage.value = response.page

    if (response.holdings.length === 0) {
      $q.notify({
        type: 'info',
        message: '검색 결과가 없습니다.'
      })
    }
  } catch (error) {
    console.error('Stock holdings search failed:', error)
    $q.notify({
      type: 'negative',
      message: '주식 보유현황 조회에 실패했습니다.'
    })
  } finally {
    loading.value = false
  }
}

const resetSearch = () => {
  searchParams.value = {
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    corpName: '',
    corpCode: '',
    reporterName: '',
    changeReason: ''
  }
  currentPage.value = 1
  holdings.value = []
  totalHoldings.value = 0
  totalPages.value = 1
  hasSearched.value = false
}

const onPaginationUpdate = (pagination: { page: number; rowsPerPage: number }) => {
  currentPage.value = pagination.page + 1 // q-table uses 0-based index
  pageSize.value = pagination.rowsPerPage
  if (hasSearched.value) {
    searchHoldings()
  }
}

const viewDetail = (holding: DartStockHolding) => {
  selectedHolding.value = holding
  showDetailDialog.value = true
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  if (typeof dateString === 'string' && dateString.includes('-')) {
    return dateString.split('T')[0]
  }
  // Handle YYYYMMDD format
  if (dateString.length === 8) {
    return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`
  }
  return dateString
}

const exportToExcel = () => {
  // TODO: Implement Excel export functionality
  $q.notify({
    type: 'info',
    message: 'Excel 내보내기 기능은 준비 중입니다.'
  })
}

// Lifecycle
onMounted(() => {
  // Optionally auto-search on mount with default date range
  // searchHoldings()
})
</script>

<style scoped lang="scss">
.holdings-table {
  .q-table__top {
    padding: 0;
  }
}
</style>
