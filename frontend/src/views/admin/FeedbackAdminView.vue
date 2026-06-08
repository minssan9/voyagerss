<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="q-my-none">기능 개선 요청 관리</h4>
        <p class="text-grey-7 q-mb-none">사용자가 등록한 기능 개선 요청을 확인하고 처리 상태를 관리합니다.</p>
      </div>
      <q-btn color="primary" label="새로고침" icon="refresh" :loading="loading" @click="load" />
    </div>

    <q-card>
      <q-card-section class="row items-center q-gutter-md">
        <q-select
          v-model="statusFilter"
          :options="statusFilterOptions"
          label="상태 필터"
          dense
          outlined
          emit-value
          map-options
          style="min-width: 180px"
          @update:model-value="load"
        />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="items"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :loading="loading"
          :pagination="pagination"
          @request="onTableRequest"
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-select
                :model-value="props.row.status"
                :options="statusOptions"
                dense
                borderless
                emit-value
                map-options
                @update:model-value="(val) => changeStatus(props.row, val)"
              >
                <template v-slot:selected>
                  <q-chip :color="statusColor(props.row.status)" text-color="white" dense>
                    {{ statusLabel(props.row.status) }}
                  </q-chip>
                </template>
              </q-select>
            </q-td>
          </template>

          <template v-slot:body-cell-reporter="props">
            <q-td :props="props">
              {{ props.row.account?.username ?? props.row.account?.email ?? '-' }}
            </q-td>
          </template>

          <template v-slot:body-cell-pageUrl="props">
            <q-td :props="props">
              <a
                v-if="isSafeUrl(props.row.pageUrl)"
                :href="props.row.pageUrl"
                target="_blank"
                rel="noopener"
              >{{ props.row.pageUrl }}</a>
              <span v-else-if="props.row.pageUrl">{{ props.row.pageUrl }}</span>
              <span v-else>-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-attachment="props">
            <q-td :props="props">
              <q-btn
                v-if="props.row.fileName"
                flat
                dense
                round
                icon="attachment"
                :href="getFeedbackFileUrl(props.row.id)"
                target="_blank"
              >
                <q-tooltip>{{ props.row.fileName }}</q-tooltip>
              </q-btn>
              <span v-else>-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-createdAt="props">
            <q-td :props="props">{{ formatDate(props.row.createdAt) }}</q-td>
          </template>

          <template v-slot:body-cell-content="props">
            <q-td :props="props">
              <div class="ellipsis" style="max-width: 280px">
                {{ props.row.content }}
                <q-tooltip max-width="360px" style="white-space: pre-wrap">{{ props.row.content }}</q-tooltip>
              </div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useFeedback, FeedbackItem } from '@/composables/useFeedback'

const $q = useQuasar()
const { loading, fetchFeedbackList, updateFeedbackStatus, getFeedbackFileUrl } = useFeedback()

const items = ref<FeedbackItem[]>([])
const statusFilter = ref<string>('')

const pagination = ref({
  sortBy: 'createdAt',
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0,
})

const statusOptions = [
  { label: '접수', value: 'OPEN' },
  { label: '처리중', value: 'IN_PROGRESS' },
  { label: '완료', value: 'DONE' },
  { label: '반려', value: 'REJECTED' },
]

const statusFilterOptions = [{ label: '전체', value: '' }, ...statusOptions]

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' as const },
  { name: 'title', label: '제목', field: 'title', align: 'left' as const },
  { name: 'content', label: '내용', field: 'content', align: 'left' as const },
  { name: 'reporter', label: '요청자', field: 'reporter', align: 'left' as const },
  { name: 'pageUrl', label: '요청 페이지', field: 'pageUrl', align: 'left' as const },
  { name: 'attachment', label: '첨부', field: 'fileName', align: 'center' as const },
  { name: 'status', label: '상태', field: 'status', align: 'center' as const },
  { name: 'createdAt', label: '등록일', field: 'createdAt', align: 'left' as const },
]

function statusLabel(status: string): string {
  return statusOptions.find(o => o.value === status)?.label ?? status
}

function statusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'blue'
    case 'IN_PROGRESS': return 'orange'
    case 'DONE': return 'green'
    case 'REJECTED': return 'grey'
    default: return 'grey'
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

function isSafeUrl(url?: string | null): boolean {
  return !!url && /^https?:\/\//i.test(url)
}

async function load() {
  try {
    const result = await fetchFeedbackList({
      status: statusFilter.value || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.rowsPerPage,
    })
    items.value = result.items
    pagination.value.rowsNumber = result.total
    pagination.value.page = result.page
    pagination.value.rowsPerPage = result.pageSize
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message ?? '목록을 불러오지 못했습니다.' })
  }
}

function onTableRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
  pagination.value.page = props.pagination.page
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  load()
}

async function changeStatus(row: FeedbackItem, status: string) {
  if (row.status === status) return
  try {
    await updateFeedbackStatus(row.id, status)
    row.status = status
    $q.notify({ type: 'positive', message: '상태가 변경되었습니다.' })
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message ?? '상태 변경에 실패했습니다.' })
  }
}

onMounted(() => {
  load()
})
</script>
