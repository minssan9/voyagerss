<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';

const $q = useQuasar();
const { t, locale } = useI18n();
const router = useRouter();

interface Provider {
  id: number;
  type: string;
  displayName: string;
  baseUrl: string;
}

type RunnerMode = 'CLI' | 'SDK';

interface Repo {
  id: number;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  webUrl: string;
  syncedAt: string | null;
  autoPilot: boolean;
  planRunner: RunnerMode;
  buildRunner: RunnerMode;
}

const runnerModeOptions = computed(() => [
  { label: t('aipr.repos.runnerModes.sdk'), value: 'SDK' },
  { label: t('aipr.repos.runnerModes.cli'), value: 'CLI' },
]);

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
    $q.notify({ type: 'negative', message: err.message || t('aipr.common.loadFailed'), position: 'top-right' });
  }
}

async function fetchRepos() {
  if (!selectedProviderId.value) return;
  isLoading.value = true;
  try {
    const res = await api.get<{ items: Repo[]; total: number }>(`/admin/providers/${selectedProviderId.value}/repos`);
    repos.value = res.items;
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || t('aipr.repos.notify.loadFailed'), position: 'top-right' });
  } finally {
    isLoading.value = false;
  }
}

async function syncRepos() {
  if (!selectedProviderId.value) return;
  isSyncing.value = true;
  try {
    const res = await api.post<{ synced: number }>(`/admin/providers/${selectedProviderId.value}/repos/sync`, {});
    $q.notify({ type: 'positive', message: t('aipr.repos.notify.syncSuccess', { count: res.synced }), position: 'top-right' });
    await fetchRepos();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || t('aipr.repos.notify.syncFailed'), position: 'top-right' });
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
        ? t('aipr.repos.notify.autoPilotEnabled', { repo: repo.fullName })
        : t('aipr.repos.notify.autoPilotDisabled', { repo: repo.fullName }),
      position: 'top-right',
    });
  } catch (err: any) {
    repo.autoPilot = !value;
    $q.notify({ type: 'negative', message: err.message || t('aipr.repos.notify.autoPilotFailed'), position: 'top-right' });
  }
}

async function updateRunnerMode(repo: Repo, field: 'planRunner' | 'buildRunner', mode: RunnerMode) {
  if (!selectedProviderId.value) return;
  const previous = repo[field];
  repo[field] = mode;
  try {
    await api.patch(`/admin/providers/${selectedProviderId.value}/repos/${repo.id}/runner-mode`, { field, mode });
    $q.notify({ type: 'positive', message: t('aipr.repos.notify.runnerChanged', { repo: repo.fullName, field: field === 'planRunner' ? t('aipr.repos.notify.runnerFieldPlan') : t('aipr.repos.notify.runnerFieldBuild'), mode }), position: 'top-right' });
  } catch (err: any) {
    repo[field] = previous;
    $q.notify({ type: 'negative', message: err.message || t('aipr.repos.notify.runnerFailed'), position: 'top-right' });
  }
}


const tableColumns = computed(() => [
  { name: 'fullName', label: t('aipr.repos.columns.fullName'), field: 'fullName', align: 'left' },
  { name: 'defaultBranch', label: t('aipr.repos.columns.defaultBranch'), field: 'defaultBranch', align: 'left' },
  { name: 'isPrivate', label: t('aipr.common.private'), field: 'isPrivate', align: 'center' },
  { name: 'autoPilot', label: t('aipr.repos.columns.autoPilot'), field: 'autoPilot', align: 'center' },
  { name: 'planRunner', label: t('aipr.repos.columns.planRunner'), field: 'planRunner', align: 'center' },
  { name: 'buildRunner', label: t('aipr.repos.columns.buildRunner'), field: 'buildRunner', align: 'center' },
  { name: 'syncedAt', label: t('aipr.repos.columns.syncedAt'), field: 'syncedAt', align: 'right' },
  { name: 'actions', label: '', field: '', align: 'right' },
]);

onMounted(fetchProviders);
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">{{ t('aipr.repos.title') }}</h1>
        <p class="text-caption text-grey-7 q-my-none">{{ t('aipr.repos.subtitle') }}</p>
      </div>
      <q-btn
        unelevated color="secondary" icon="sync" :label="t('aipr.repos.sync')"
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
    <div v-else class="text-grey-6 q-mb-md">{{ t('aipr.repos.registerProviderFirst') }}</div>

    <q-spinner v-if="isLoading" color="primary" size="2rem" />

    <div v-else-if="repos.length === 0 && selectedProviderId" class="text-grey-6 text-center q-mt-xl">
      {{ t('aipr.repos.empty') }}
    </div>

    <q-table
      v-else-if="repos.length"
      :rows="repos"
      :columns="tableColumns"
      row-key="id"
      flat bordered
      class="rounded-borders shadow-1"
      :loading="isLoading"
      :no-data-label="t('aipr.repos.noData')"
    >
      <template v-slot:body-cell-fullName="props">
        <q-td :props="props">
          <span class="text-weight-medium">{{ props.row.fullName }}</span>
          <div v-if="props.row.description" class="text-caption text-grey-6">{{ props.row.description }}</div>
        </q-td>
      </template>
      <template v-slot:body-cell-isPrivate="props">
        <q-td :props="props">
          <q-badge :color="props.row.isPrivate ? 'warning' : 'positive'" :label="props.row.isPrivate ? t('aipr.common.privateBadge') : t('aipr.common.public')" />
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
      <template v-slot:body-cell-planRunner="props">
        <q-td :props="props">
          <q-select
            :model-value="props.row.planRunner"
            :options="runnerModeOptions"
            emit-value map-options dense outlined
            style="min-width: 170px"
            @update:model-value="(val: RunnerMode) => updateRunnerMode(props.row, 'planRunner', val)"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-buildRunner="props">
        <q-td :props="props">
          <q-select
            :model-value="props.row.buildRunner"
            :options="runnerModeOptions"
            emit-value map-options dense outlined
            style="min-width: 170px"
            @update:model-value="(val: RunnerMode) => updateRunnerMode(props.row, 'buildRunner', val)"
          />
        </q-td>
      </template>
      <template v-slot:body-cell-syncedAt="props">
        <q-td :props="props" class="text-caption text-grey-6">
          {{ props.row.syncedAt ? new Date(props.row.syncedAt).toLocaleDateString(locale.value === 'ko' ? 'ko-KR' : 'en-US') : '—' }}
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense size="sm" color="primary" :label="t('aipr.repos.viewIssues')" icon="bug_report" @click="browseIssues(props.row.id)" />
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<style scoped>
.rounded-borders { border-radius: 8px; }
</style>
