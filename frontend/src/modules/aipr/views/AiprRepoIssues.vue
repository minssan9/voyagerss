<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const repoId = Number(route.params.repoId);

interface RemoteIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  author: string;
  createdAt: string;
  url: string;
}

const issues = ref<RemoteIssue[]>([]);
const isLoading = ref(false);
const isImporting = ref<Record<number, boolean>>({});

async function fetchIssues() {
  isLoading.value = true;
  try {
    issues.value = await api.get<RemoteIssue[]>(`/admin/repos/${repoId}/issues`);
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || '이슈 불러오기 실패', position: 'top-right' });
  } finally {
    isLoading.value = false;
  }
}

async function importIssue(num: number) {
  isImporting.value[num] = true;
  try {
    const created = await api.post<{ id: string }>(`/admin/repos/${repoId}/issues/${num}/import`, {});
    $q.notify({ type: 'positive', message: `이슈 #${num} 임포트됨`, position: 'top-right' });
    router.push({ name: 'aipr-issue-detail', params: { id: created.id } });
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || '임포트 실패', position: 'top-right' });
  } finally {
    isImporting.value[num] = false;
  }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

onMounted(fetchIssues);
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-btn flat dense round icon="arrow_back" color="primary" @click="router.back()" />
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">Remote Issues</h1>
        <p class="text-caption text-grey-7 q-my-none">원격 저장소 이슈 목록</p>
      </div>
      <q-space />
      <q-btn flat dense icon="refresh" color="grey-7" @click="fetchIssues" :loading="isLoading" />
    </div>

    <q-spinner v-if="isLoading" color="primary" size="2rem" />

    <div v-else-if="issues.length === 0" class="text-grey-6 text-center q-mt-xl">
      열린 이슈가 없습니다.
    </div>

    <q-list v-else bordered separator class="rounded-borders shadow-1">
      <q-item v-for="issue in issues" :key="issue.number" class="q-py-sm">
        <q-item-section avatar>
          <q-badge color="blue-grey" :label="`#${issue.number}`" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ issue.title }}</q-item-label>
          <q-item-label caption>
            <span class="text-grey-6">@{{ issue.author || '—' }}</span>
            &nbsp;·&nbsp;
            <span>{{ fmtDate(issue.createdAt) }}</span>
          </q-item-label>
          <div v-if="issue.labels.length" class="row q-gutter-xs q-mt-xs">
            <q-badge
              v-for="label in issue.labels" :key="label"
              color="grey-3" text-color="grey-8"
              :label="label"
              class="text-caption"
            />
          </div>
        </q-item-section>
        <q-item-section side>
          <div class="row q-gutter-xs">
            <q-btn
              flat dense size="sm" color="grey-7" icon="open_in_new"
              :href="issue.url" target="_blank"
            >
              <q-tooltip>원본 보기</q-tooltip>
            </q-btn>
            <q-btn
              unelevated size="sm" color="primary" label="Task로 임포트"
              :loading="isImporting[issue.number]"
              @click="importIssue(issue.number)"
            />
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<style scoped>
.rounded-borders { border-radius: 8px; }
</style>
