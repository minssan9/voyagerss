<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const api   = useApi();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const STATUS_OPTIONS = [
  'ALL','NEW','TRIAGED','QUEUED','PLAN_READY','BUILDING','PR_OPEN','MERGED','CLOSED','FAILED',
];

const filter = reactive({
  status: (route.query.status as string) || 'ALL',
  page:   Number(route.query.page) || 1,
});

interface IssueItem {
  id: string; status: string; title: string;
  reporterEmail: string | null; createdAt: string;
  _count: { runs: number };
}
interface IssueList { items: IssueItem[]; total: number; totalPages: number; page: number; }

const { data, refresh, pending } = await useAsyncData<IssueList>(
  'issues',
  () => {
    const qs = new URLSearchParams({ page: String(filter.page), limit: '20' });
    if (filter.status !== 'ALL') qs.set('status', filter.status);
    return api.get<IssueList>(`/api/admin/issues?${qs}`);
  },
  { watch: [() => filter.status, () => filter.page] },
);

function setStatus(s: string) { filter.status = s; filter.page = 1; router.replace({ query: { status: s } }); }
function setPage(p: number)   { filter.page = p; }

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-700 tracking-tight">Issues</h1>
        <p class="text-sm text-muted mt-0.5">{{ data?.total ?? 0 }}개 전체</p>
      </div>
    </div>

    <!-- Status filter tabs -->
    <div class="flex gap-1.5 flex-wrap mb-5">
      <button
        v-for="s in STATUS_OPTIONS"
        :key="s"
        class="btn text-xs py-1.5 px-3"
        :class="filter.status === s ? 'btn-primary' : 'btn-secondary'"
        @click="setStatus(s)"
      >{{ s }}</button>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-muted text-sm animate-pulse">Loading…</div>
      <div v-else-if="!data?.items.length" class="p-8 text-center text-muted text-sm">
        이슈가 없습니다.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="border-b border-border">
          <tr class="text-left text-xs text-muted">
            <th class="px-5 py-3 font-500">상태</th>
            <th class="px-5 py-3 font-500">제목</th>
            <th class="px-5 py-3 font-500 hidden md:table-cell">Reporter</th>
            <th class="px-5 py-3 font-500 hidden lg:table-cell">Runs</th>
            <th class="px-5 py-3 font-500 hidden lg:table-cell">생성일</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="issue in data.items"
            :key="issue.id"
            class="hover:bg-surface transition-colors cursor-pointer"
            @click="$router.push(`/issues/${issue.id}`)"
          >
            <td class="px-5 py-3.5">
              <StatusChip :status="issue.status" />
            </td>
            <td class="px-5 py-3.5 font-500 text-[#111] max-w-xs truncate">
              {{ issue.title }}
            </td>
            <td class="px-5 py-3.5 text-muted hidden md:table-cell truncate max-w-[160px]">
              {{ issue.reporterEmail ?? '—' }}
            </td>
            <td class="px-5 py-3.5 text-muted hidden lg:table-cell">
              {{ issue._count.runs }}
            </td>
            <td class="px-5 py-3.5 text-muted hidden lg:table-cell whitespace-nowrap">
              {{ fmtDate(issue.createdAt) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="data && data.totalPages > 1" class="flex justify-center gap-2 mt-5">
      <button
        v-for="p in data.totalPages"
        :key="p"
        class="btn text-xs w-8 h-8 p-0 justify-center"
        :class="filter.page === p ? 'btn-primary' : 'btn-secondary'"
        @click="setPage(p)"
      >{{ p }}</button>
    </div>
  </div>
</template>
