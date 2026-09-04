<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api/api-aipr';
import StatusChip from './components/StatusChip.vue';
import AiprRunTimeline from './components/AiprRunTimeline.vue';
import { useQuasar } from 'quasar';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const id = route.params.id as string;

interface Attachment { id: string; s3Key: string; mime: string; size: number; }
interface PlanningDoc { id: string; version: number; content: string; createdAt: string; }
interface Run { id: string; kind: string; status: string; startedAt: string | null; branchName: string | null; prUrl: string | null; }
interface PullRequest { id: string; prNumber: number; prUrl: string; state: string; }

interface IssueDetail {
  id: string;
  status: string;
  title: string;
  body: string;
  reporterEmail: string | null;
  repoFullName: string | null;
  baseBranch: string;
  createdAt: string;
  attachments: Attachment[];
  planningDocs: PlanningDoc[];
  runs: Run[];
  pullRequests: PullRequest[];
}

const issue = ref<IssueDetail | null>(null);
const isTransitioning = ref(false);
const isDataLoading = ref(false);

const TERMINAL_STATUSES = new Set(['MERGED', 'CLOSED', 'FAILED']);
let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchIssueDetail() {
  isDataLoading.value = true;
  try {
    const res = await api.get<IssueDetail>(`/admin/issues/${id}`);
    issue.value = res;
    
    if (TERMINAL_STATUSES.has(res.status)) {
      stopPolling();
    }
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || '이슈 상세 정보를 불러오지 못했습니다.',
      position: 'top-right',
    });
  } finally {
    isDataLoading.value = false;
  }
}

function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    try {
      const res = await api.get<IssueDetail>(`/admin/issues/${id}`);
      issue.value = res;
      if (TERMINAL_STATUSES.has(res.status)) {
        stopPolling();
      }
    } catch { /* silently ignore details poll errors */ }
  }, 10000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

const activeRunId = computed(() => {
  if (!issue.value) return null;
  return issue.value.runs.find((r) => r.status === 'RUNNING')?.id ?? null;
});

const latestPlan = computed(() => {
  if (!issue.value || !issue.value.planningDocs.length) return null;
  return issue.value.planningDocs[0];
});

const TRANSITION_MAP: Record<string, { label: string; to: string; color: string }[]> = {
  NEW:        [{ label: 'Triage',      to: 'TRIAGED',  color: 'grey-7' }],
  TRIAGED:    [{ label: 'Approve',     to: 'QUEUED',   color: 'primary' },
               { label: 'Close',       to: 'CLOSED',   color: 'negative' }],
  PLAN_READY: [{ label: 'Start Build', to: 'BUILDING', color: 'primary' },
               { label: 'Close',       to: 'CLOSED',   color: 'negative' }],
  FAILED:     [{ label: 'Retry',       to: 'QUEUED',   color: 'secondary' }],
};

const actions = computed(() => {
  if (!issue.value) return [];
  return TRANSITION_MAP[issue.value.status] ?? [];
});

async function transition(to: string) {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  try {
    await api.patch(`/admin/issues/${id}`, { status: to });
    await fetchIssueDetail();
    $q.notify({
      type: 'positive',
      message: `상태가 ${to}로 변경되었습니다.`,
      position: 'top-right',
    });
    if (!TERMINAL_STATUSES.has(to)) {
      startPolling();
    }
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || '상태 변경 중 오류가 발생했습니다.',
      position: 'top-right',
    });
  } finally {
    isTransitioning.value = false;
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ko-KR');
}

onMounted(() => {
  fetchIssueDetail().then(() => {
    if (issue.value && !TERMINAL_STATUSES.has(issue.value.status)) {
      startPolling();
    }
  });
});

onUnmounted(stopPolling);
</script>

<template>
  <div class="q-pa-md" v-if="issue">
    <!-- Back + Header -->
    <div class="row items-start justify-between q-mb-md">
      <div>
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          icon="arrow_back"
          label="Issues"
          class="q-mb-sm"
          @click="router.push({ name: 'aipr-issues' })"
        />
        <h1 class="text-h5 text-weight-bold q-my-none">{{ issue.title }}</h1>
        <div class="row items-center q-gutter-md q-mt-xs">
          <StatusChip :status="issue.status" />
          <span class="text-caption text-grey-6">{{ fmtDate(issue.createdAt) }}</span>
          <span v-if="issue.reporterEmail" class="text-caption text-grey-6">{{ issue.reporterEmail }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="actions.length" class="row q-gutter-sm">
        <q-btn
          v-for="a in actions"
          :key="a.to"
          :label="a.label"
          :color="a.color"
          :loading="isTransitioning"
          unelevated
          dense
          class="q-px-md"
          @click="transition(a.to)"
        />
      </div>
    </div>

    <!-- Details Grid -->
    <div class="row q-col-gutter-md">
      <!-- Left Column -->
      <div class="col-xs-12 col-md-8 q-gutter-y-md">
        <!-- Body -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-xs">Description</div>
            <p class="text-body2 text-black q-my-none whitespace-pre-wrap leading-relaxed">
              {{ issue.body }}
            </p>
          </q-card-section>
        </q-card>

        <!-- Attachments -->
        <q-card flat bordered v-if="issue.attachments.length">
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-md">Attachments</div>
            <div class="row q-col-gutter-sm">
              <div
                v-for="att in issue.attachments"
                :key="att.id"
                class="col-auto"
              >
                <!-- Proxy /api/aipr/attachments/:s3Key -->
                <a
                  :href="`/api/aipr/attachments/${att.s3Key}`"
                  target="_blank"
                  class="block-link border-rounded border-grey-4 text-center flex flex-center"
                >
                  <img
                    v-if="att.mime.startsWith('image/')"
                    :src="`/api/aipr/attachments/${att.s3Key}`"
                    class="attachment-img"
                    alt="attachment"
                  />
                  <div v-else class="q-pa-md text-grey-7 text-caption">📎</div>
                </a>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Planning Document -->
        <q-card flat bordered v-if="latestPlan">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle2 text-grey-7 text-uppercase">Plan v{{ latestPlan.version }}</div>
              <span class="text-caption text-grey-6">{{ fmtDate(latestPlan.createdAt) }}</span>
            </div>
            <pre class="bg-grey-2 q-pa-md rounded font-mono text-caption text-black whitespace-pre-wrap scroll-x">{{ latestPlan.content }}</pre>
          </q-card-section>
        </q-card>

        <!-- Timeline console -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-md">Run Log</div>
            <AiprRunTimeline :issue-id="id" :run-id="activeRunId" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Right Column -->
      <div class="col-xs-12 col-md-4 q-gutter-y-md">
        <!-- Metadata -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-md">Details</div>
            <q-list dense>
              <q-item class="q-px-none">
                <q-item-section>
                  <q-item-label caption>Repository</q-item-label>
                  <q-item-label class="text-weight-medium">{{ issue.repoFullName ?? '—' }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item class="q-px-none">
                <q-item-section>
                  <q-item-label caption>Base branch</q-item-label>
                  <q-item-label class="text-weight-medium">{{ issue.baseBranch }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Runs -->
        <q-card flat bordered v-if="issue.runs.length">
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-md">Runs</div>
            <q-list bordered separator class="rounded-borders">
              <q-item v-for="run in issue.runs" :key="run.id">
                <q-item-section avatar>
                  <StatusChip :status="run.status" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-caption text-weight-medium">{{ run.kind }}</q-item-label>
                  <q-item-label v-if="run.branchName" caption class="font-mono text-grey-7 text-weight-light">{{ run.branchName }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- PR cards -->
        <q-card flat bordered v-if="issue.pullRequests.length">
          <q-card-section>
            <div class="text-subtitle2 text-grey-7 text-uppercase q-mb-md">Pull Requests</div>
            <q-list bordered separator class="rounded-borders">
              <q-item
                v-for="pr in issue.pullRequests"
                :key="pr.id"
                clickable
                tag="a"
                :href="pr.prUrl"
                target="_blank"
              >
                <q-item-section avatar>
                  <q-icon name="merge_type" color="accent" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold text-accent">#{{ pr.prNumber }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <StatusChip :status="pr.state.toUpperCase()" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block-link {
  width: 96px;
  height: 96px;
  border-width: 1px;
  border-style: solid;
  overflow: hidden;
  cursor: pointer;
  background-color: #fafafa;
}

.border-rounded {
  border-radius: 8px;
}

.attachment-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scroll-x {
  overflow-x: auto;
}

.font-mono {
  font-family: monospace;
}

.leading-relaxed {
  line-height: 1.625;
}
</style>
