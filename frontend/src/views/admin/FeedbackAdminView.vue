<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="q-my-none">{{ t('feedback.admin.title') }}</h4>
        <p class="text-grey-7 q-mb-none">{{ t('feedback.admin.subtitle') }}</p>
      </div>
      <q-btn color="primary" :label="t('feedback.admin.refresh')" icon="refresh" :loading="loading" @click="load" />
    </div>

    <q-card>
      <q-card-section class="row items-center q-gutter-md">
        <q-select
          v-model="statusFilter"
          :options="statusFilterOptions"
          :label="t('feedback.admin.statusFilter')"
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
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useFeedback, FeedbackItem } from '@/composables/useFeedback'

const { t } = useI18n()
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

const statusOptions = computed(() => [
  { label: t('feedback.status.open'), value: 'OPEN' },
  { label: t('feedback.status.inProgress'), value: 'IN_PROGRESS' },
  { label: t('feedback.status.done'), value: 'DONE' },
  { label: t('feedback.status.rejected'), value: 'REJECTED' },
])

const statusFilterOptions = computed(() => [
  { label: t('feedback.status.all'), value: '' },
  ...statusOptions.value,
])

const columns = computed(() => [
  { name: 'id', label: t('feedback.columns.id'), field: 'id', align: 'left' as const },
  { name: 'title', label: t('feedback.columns.title'), field: 'title', align: 'left' as const },
  { name: 'content', label: t('feedback.columns.content'), field: 'content', align: 'left' as const },
  { name: 'reporter', label: t('feedback.columns.reporter'), field: 'reporter', align: 'left' as const },
  { name: 'pageUrl', label: t('feedback.columns.pageUrl'), field: 'pageUrl', align: 'left' as const },
  { name: 'attachment', label: t('feedback.columns.attachment'), field: 'fileName', align: 'center' as const },
  { name: 'status', label: t('feedback.columns.status'), field: 'status', align: 'center' as const },
  { name: 'createdAt', label: t('feedback.columns.createdAt'), field: 'createdAt', align: 'left' as const },
])

function statusLabel(status: string): string {
  return statusOptions.value.find(o => o.value === status)?.label ?? status
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
    $q.notify({ type: 'negative', message: e?.message ?? t('feedback.admin.loadFailed') })
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
    $q.notify({ type: 'positive', message: t('feedback.admin.statusChanged') })
  } catch (e: any) {
    $q.notify({ type: 'negative', message: e?.message ?? t('feedback.admin.statusChangeFailed') })
  }
}

onMounted(() => {
  load()
})
</script>
