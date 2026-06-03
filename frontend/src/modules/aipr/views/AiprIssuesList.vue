<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../api/api-aipr';
import StatusChip from './components/StatusChip.vue';
import { useQuasar } from 'quasar';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();

const STATUS_OPTIONS = [
  'ALL', 'NEW', 'TRIAGED', 'QUEUED', 'PLAN_READY', 'BUILDING', 'PR_OPEN', 'MERGED', 'CLOSED', 'FAILED',
];

const filter = reactive({
  status: (route.query.status as string) || 'ALL',
  page: Number(route.query.page) || 1,
});

interface IssueItem {
  id: string;
  status: string;
  title: string;
  reporterEmail: string | null;
  createdAt: string;
  _count: { runs: number };
}

interface IssueListResponse {
  items: IssueItem[];
  total: number;
  totalPages: number;
  page: number;
}

const items = ref<IssueItem[]>([]);
const totalCount = ref(0);
const totalPages = ref(1);
const isLoading = ref(false);

const columns = [
  { name: 'status', label: '상태', field: 'status', align: 'left' as const },
  { name: 'title', label: '제목', field: 'title', align: 'left' as const },
  { name: 'reporterEmail', label: 'Reporter', field: 'reporterEmail', align: 'left' as const },
  { name: 'runs', label: 'Runs', field: (row: IssueItem) => row._count.runs, align: 'center' as const },
  { name: 'createdAt', label: '생성일', field: 'createdAt', align: 'right' as const },
];

async function fetchIssues() {
  isLoading.value = true;
  try {
    const params: Record<string, string> = {
      page: String(filter.page),
      limit: '20',
    };
    if (filter.status !== 'ALL') {
      params.status = filter.status;
    }
    const qs = new URLSearchParams(params).toString();
    const res = await api.get<IssueListResponse>(`/admin/issues?${qs}`);
    items.value = res.items;
    totalCount.value = res.total;
    totalPages.value = res.totalPages;
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || '이슈 목록을 불러오지 못했습니다.',
      position: 'top-right',
    });
  } finally {
    isLoading.value = false;
  }
}

function setStatus(s: string) {
  filter.status = s;
  filter.page = 1;
  router.replace({ query: { status: s, page: '1' } });
}

function setPage(p: number) {
  filter.page = p;
  router.replace({ query: { ...route.query, page: String(p) } });
}

function handleRowClick(evt: any, row: IssueItem) {
  router.push({ name: 'aipr-issue-detail', params: { id: row.id } });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(fetchIssues);

watch(
  () => [filter.status, filter.page],
  fetchIssues
);
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">Issues</h1>
        <p class="text-caption text-grey-7 q-my-none">{{ totalCount }}개 전체</p>
      </div>
      <q-btn
        flat
        round
        dense
        icon="settings"
        color="grey-7"
        @click="router.push({ name: 'aipr-settings' })"
        label="설정"
      />
    </div>

    <!-- Status Filter Buttons -->
    <div class="row q-gutter-xs q-mb-lg">
      <q-btn
        v-for="s in STATUS_OPTIONS"
        :key="s"
        :label="s"
        :color="filter.status === s ? 'primary' : 'grey-3'"
        :text-color="filter.status === s ? 'white' : 'grey-8'"
        class="text-weight-bold"
        size="sm"
        unelevated
        @click="setStatus(s)"
      />
    </div>

    <!-- Issues Table -->
    <q-table
      :rows="items"
      :columns="columns"
      row-key="id"
      :loading="isLoading"
      hide-pagination
      flat
      bordered
      class="rounded-borders shadow-1"
      @row-click="handleRowClick"
      no-data-label="이슈가 없습니다."
      loading-label="불러오는 중..."
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <StatusChip :status="props.row.status" />
        </q-td>
      </template>

      <template v-slot:body-cell-title="props">
        <q-td :props="props" class="text-weight-medium text-primary cursor-pointer">
          {{ props.row.title }}
        </q-td>
      </template>

      <template v-slot:body-cell-reporterEmail="props">
        <q-td :props="props">
          {{ props.row.reporterEmail ?? '—' }}
        </q-td>
      </template>

      <template v-slot:body-cell-createdAt="props">
        <q-td :props="props">
          {{ fmtDate(props.row.createdAt) }}
        </q-td>
      </template>
    </q-table>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="row justify-center q-mt-lg">
      <q-pagination
        v-model="filter.page"
        :max="totalPages"
        input
        @update:model-value="setPage"
      />
    </div>
  </div>
</template>

<style scoped>
.rounded-borders {
  border-radius: 8px;
}
</style>
