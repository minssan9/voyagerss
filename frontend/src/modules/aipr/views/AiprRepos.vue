<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();

interface Provider {
  id: number;
  type: string;
  displayName: string;
  baseUrl: string;
}

interface Repo {
  id: number;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  webUrl: string;
  syncedAt: string | null;
  autoPilot: boolean;
}

const providers = ref<Provider[]>([]);
const repos = ref<Repo[]>([]);
const selectedProviderId = ref<number | null>(null);
const isLoading = ref(false);
const isSyncing = ref(false);

async function fetchProviders() {
  try {
    providers.value = await api.get<Provider[]>('/admin/providers');
    if (providers.value.length && !selectedProviderId.value) {
      selectedProviderId.value = providers.value[0].id;
      await fetchRepos();
    }
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || '불러오기 실패', position: 'top-right' });
  }
}

async function fetchRepos() {
  if (!selectedProviderId.value) return;
  isLoading.value = true;
  try {
    const res = await api.get<{ items: Repo[]; total: number }>(`/admin/providers/${selectedProviderId.value}/repos`);
    repos.value = res.items;
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || '저장소 불러오기 실패', position: 'top-right' });
  } finally {
    isLoading.value = false;
  }
}

async function syncRepos() {
  if (!selectedProviderId.value) return;
  isSyncing.value = true;
  try {
    const res = await api.post<{ synced: number }>(`/admin/providers/${selectedProviderId.value}/repos/sync`, {});
    $q.notify({ type: 'positive', message: `${res.synced}개 저장소 동기화 완료`, position: 'top-right' });
    await fetchRepos();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || '동기화 실패', position: 'top-right' });
  } finally {
    isSyncing.value = false;
  }
}

function selectProvider(id: number) {
  selectedProviderId.value = id;
  repos.value = [];
  fetchRepos();
}

function browseIssues(repoId: number) {
  router.push({ name: 'aipr-repo-issues', params: { repoId } });
}

async function toggleAutoPilot(repo: Repo, value: boolean) {
  if (!selectedProviderId.value) return;
  try {
    await api.patch(`/admin/providers/${selectedProviderId.value}/repos/${repo.id}/auto-pilot`, { autoPilot: value });
    repo.autoPilot = value;
    $q.notify({
      type: 'positive',
      message: value
        ? `${repo.fullName}: 이슈 생성 시 자동으로 계획+빌드가 실행됩니다.`
        : `${repo.fullName}: Auto-pilot이 비활성화되었습니다.`,
      position: 'top-right',
    });
  } catch (err: any) {
    repo.autoPilot = !value;
    $q.notify({ type: 'negative', message: err.message || 'Auto-pilot 변경 실패', position: 'top-right' });
  }
}

onMounted(fetchProviders);
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">Repositories</h1>
        <p class="text-caption text-grey-7 q-my-none">Provider별 저장소 목록</p>
      </div>
      <q-btn
        unelevated color="secondary" icon="sync" label="동기화"
        :loading="isSyncing" :disable="!selectedProviderId"
        @click="syncRepos"
      />
    </div>

    <!-- Provider Tabs -->
    <div v-if="providers.length" class="row q-gutter-xs q-mb-lg">
      <q-btn
        v-for="p in providers" :key="p.id"
        :label="p.displayName"
        :color="selectedProviderId === p.id ? 'primary' : 'grey-3'"
        :text-color="selectedProviderId === p.id ? 'white' : 'grey-8'"
        size="sm" unelevated
        @click="selectProvider(p.id)"
      />
    </div>
    <div v-else class="text-grey-6 q-mb-md">Provider를 먼저 등록하세요.</div>

    <q-spinner v-if="isLoading" color="primary" size="2rem" />

    <div v-else-if="repos.length === 0 && selectedProviderId" class="text-grey-6 text-center q-mt-xl">
      저장소가 없습니다. 동기화 버튼을 눌러 불러오세요.
    </div>

    <q-table
      v-else-if="repos.length"
      :rows="repos"
      :columns="[
        { name: 'fullName', label: '저장소', field: 'fullName', align: 'left' },
        { name: 'defaultBranch', label: 'Default Branch', field: 'defaultBranch', align: 'left' },
        { name: 'isPrivate', label: 'Private', field: 'isPrivate', align: 'center' },
        { name: 'autoPilot', label: 'Auto-pilot', field: 'autoPilot', align: 'center' },
        { name: 'syncedAt', label: '동기화', field: 'syncedAt', align: 'right' },
        { name: 'actions', label: '', field: '', align: 'right' },
      ]"
      row-key="id"
      flat bordered
      class="rounded-borders shadow-1"
      :loading="isLoading"
      no-data-label="저장소 없음"
    >
      <template v-slot:body-cell-fullName="props">
        <q-td :props="props">
          <span class="text-weight-medium">{{ props.row.fullName }}</span>
          <div v-if="props.row.description" class="text-caption text-grey-6">{{ props.row.description }}</div>
        </q-td>
      </template>
      <template v-slot:body-cell-isPrivate="props">
        <q-td :props="props">
          <q-badge :color="props.row.isPrivate ? 'warning' : 'positive'" :label="props.row.isPrivate ? '비공개' : '공개'" />
        </q-td>
      </template>
      <template v-slot:body-cell-autoPilot="props">
        <q-td :props="props">
          <q-toggle
            :model-value="props.row.autoPilot"
            color="primary"
            @update:model-value="(val: boolean) => toggleAutoPilot(props.row, val)"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-syncedAt="props">
        <q-td :props="props" class="text-caption text-grey-6">
          {{ props.row.syncedAt ? new Date(props.row.syncedAt).toLocaleDateString('ko-KR') : '—' }}
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense size="sm" color="primary" label="이슈 보기" icon="bug_report" @click="browseIssues(props.row.id)" />
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<style scoped>
.rounded-borders { border-radius: 8px; }
</style>
