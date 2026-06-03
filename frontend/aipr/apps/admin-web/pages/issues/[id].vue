<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const route = useRoute();
const api   = useApi();
const toast = useToast();
const id    = route.params.id as string;

// ── Data ─────────────────────────────────────────────────────────────────────
interface Issue {
  id: string; status: string; title: string; body: string;
  reporterEmail: string | null; repoFullName: string | null;
  baseBranch: string; createdAt: string;
  attachments:  { id: string; s3Key: string; mime: string }[];
  planningDocs: { id: string; version: number; content: string; createdAt: string }[];
  runs:         { id: string; kind: string; status: string; startedAt: string | null; branchName: string | null; prUrl: string | null }[];
  pullRequests: { id: string; prNumber: number; prUrl: string; state: string }[];
}

const { data: issue, refresh } = await useAsyncData<Issue>(`issue-${id}`, () =>
  api.get<Issue>(`/api/admin/issues/${id}`),
);

// Poll every 10s to reflect webhook status changes (PR merged, closed, etc.)
const POLL_INTERVAL = 10_000;
const TERMINAL = new Set(['MERGED', 'CLOSED', 'FAILED']);
let poller: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  poller = setInterval(async () => {
    if (issue.value && TERMINAL.has(issue.value.status)) {
      if (poller) clearInterval(poller);
      return;
    }
    await refresh();
  }, POLL_INTERVAL);
});

onUnmounted(() => { if (poller) clearInterval(poller); });

const activeRunId = computed(() =>
  issue.value?.runs.find((r) => r.status === 'RUNNING')?.id ?? null,
);
const latestPlan = computed(() =>
  issue.value?.planningDocs[0] ?? null,
);

// ── Actions ───────────────────────────────────────────────────────────────────
const actioning = ref(false);

const TRANSITION_MAP: Record<string, { label: string; to: string; variant: string }[]> = {
  NEW:        [{ label: 'Triage',      to: 'TRIAGED',  variant: 'btn-secondary' }],
  TRIAGED:    [{ label: 'Approve',     to: 'QUEUED',   variant: 'btn-primary'   },
               { label: 'Close',       to: 'CLOSED',   variant: 'btn-danger'    }],
  PLAN_READY: [{ label: 'Start Build', to: 'BUILDING', variant: 'btn-primary'   },
               { label: 'Close',       to: 'CLOSED',   variant: 'btn-danger'    }],
  FAILED:     [{ label: 'Retry',       to: 'QUEUED',   variant: 'btn-secondary' }],
};

async function transition(to: string) {
  if (actioning.value) return;
  actioning.value = true;
  try {
    await api.patch(`/api/admin/issues/${id}`, { status: to });
    await refresh();
    toast.success(`상태가 ${to}로 변경되었습니다.`);
  } catch (e: any) {
    toast.error(e.message ?? '오류가 발생했습니다.');
  } finally {
    actioning.value = false;
  }
}

const actions = computed(() => TRANSITION_MAP[issue.value?.status ?? ''] ?? []);

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ko-KR');
}
</script>

<template>
  <div v-if="issue">
    <!-- Back + Header -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <NuxtLink to="/issues" class="text-xs text-muted hover:text-accent mb-2 inline-block">
          ← Issues
        </NuxtLink>
        <h1 class="text-lg font-700 tracking-tight leading-snug">{{ issue.title }}</h1>
        <div class="flex items-center gap-3 mt-2">
          <StatusChip :status="issue.status" />
          <span class="text-xs text-muted">{{ fmtDate(issue.createdAt) }}</span>
          <span v-if="issue.reporterEmail" class="text-xs text-muted">{{ issue.reporterEmail }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div v-if="actions.length" class="flex gap-2 flex-shrink-0">
        <button
          v-for="a in actions"
          :key="a.to"
          class="btn text-sm"
          :class="a.variant"
          :disabled="actioning"
          @click="transition(a.to)"
        >{{ a.label }}</button>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Left column -->
      <div class="xl:col-span-2 flex flex-col gap-6">

        <!-- Body -->
        <div class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-3">Description</h2>
          <p class="text-sm text-[#111] whitespace-pre-wrap leading-relaxed">{{ issue.body }}</p>
        </div>

        <!-- Attachments -->
        <div v-if="issue.attachments.length" class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-3">Attachments</h2>
          <div class="flex flex-wrap gap-3">
            <a
              v-for="att in issue.attachments"
              :key="att.id"
              :href="`${$config.public.apiUrl}/attachments/${att.s3Key}`"
              target="_blank"
              class="block w-24 h-24 rounded-xl border border-border overflow-hidden
                     hover:border-accent transition-colors"
            >
              <img v-if="att.mime.startsWith('image/')" class="w-full h-full object-cover" :src="`${$config.public.apiUrl}/attachments/${att.s3Key}`" alt="attachment" />
              <div v-else class="w-full h-full flex items-center justify-center text-muted text-xs">📎</div>
            </a>
          </div>
        </div>

        <!-- Planning Doc -->
        <div v-if="latestPlan" class="card p-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-600 text-muted uppercase tracking-wide">Plan v{{ latestPlan.version }}</h2>
            <span class="text-xs text-muted">{{ fmtDate(latestPlan.createdAt) }}</span>
          </div>
          <pre class="text-sm text-[#111] whitespace-pre-wrap leading-relaxed font-mono
                      bg-surface rounded-xl p-4 border border-border overflow-x-auto">{{ latestPlan.content }}</pre>
        </div>

        <!-- Run Timeline (SSE) -->
        <div class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-3">Run Log</h2>
          <RunTimeline :issue-id="id" :run-id="activeRunId" />
        </div>
      </div>

      <!-- Right column -->
      <div class="flex flex-col gap-6">

        <!-- Meta -->
        <div class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-4">Details</h2>
          <dl class="flex flex-col gap-3 text-sm">
            <div>
              <dt class="text-xs text-muted mb-0.5">Repository</dt>
              <dd class="font-500">{{ issue.repoFullName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted mb-0.5">Base branch</dt>
              <dd class="font-500">{{ issue.baseBranch }}</dd>
            </div>
          </dl>
        </div>

        <!-- Runs -->
        <div v-if="issue.runs.length" class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-4">Runs</h2>
          <div class="flex flex-col gap-2">
            <div
              v-for="run in issue.runs"
              :key="run.id"
              class="flex items-center gap-2 p-3 rounded-xl bg-surface border border-border text-xs"
            >
              <StatusChip :status="run.status" />
              <span class="text-muted">{{ run.kind }}</span>
              <span v-if="run.branchName" class="font-mono text-[10px] text-muted truncate flex-1">
                {{ run.branchName }}
              </span>
            </div>
          </div>
        </div>

        <!-- PR cards -->
        <div v-if="issue.pullRequests.length" class="card p-6">
          <h2 class="text-xs font-600 text-muted uppercase tracking-wide mb-4">Pull Requests</h2>
          <div class="flex flex-col gap-3">
            <a
              v-for="pr in issue.pullRequests"
              :key="pr.id"
              :href="pr.prUrl"
              target="_blank"
              class="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border
                     hover:border-accent transition-colors text-xs"
            >
              <span class="text-base">🔀</span>
              <span class="font-500 text-accent">#{{ pr.prNumber }}</span>
              <StatusChip :status="pr.state" />
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
