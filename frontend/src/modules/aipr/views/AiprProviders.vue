<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';

const $q = useQuasar();
const { t } = useI18n();

interface Provider {
  id: number;
  type: string;
  displayName: string;
  baseUrl: string;
  token: string;
  createdAt: string;
  _count: { repositories: number };
}

const providers = ref<Provider[]>([]);
const isLoading = ref(false);
const isTesting = ref<Record<number, boolean>>({});
const showAddDialog = ref(false);

const form = reactive({
  type: 'GITLAB',
  displayName: '',
  baseUrl: 'http://192.168.10.10:8929',
  token: '',
});

async function fetchProviders() {
  isLoading.value = true;
  try {
    providers.value = await api.get<Provider[]>('/admin/providers');
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || t('aipr.common.loadFailed'), position: 'top-right' });
  } finally {
    isLoading.value = false;
  }
}

async function addProvider() {
  try {
    await api.post('/admin/providers', { ...form });
    $q.notify({ type: 'positive', message: t('aipr.providers.notify.added'), position: 'top-right' });
    showAddDialog.value = false;
    Object.assign(form, { type: 'GITLAB', displayName: '', baseUrl: 'http://192.168.10.10:8929', token: '' });
    await fetchProviders();
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || t('aipr.providers.notify.addFailed'), position: 'top-right' });
  }
}

async function testProvider(id: number) {
  isTesting.value[id] = true;
  try {
    const result = await api.post<{ ok: boolean; login: string; name: string }>(`/admin/providers/${id}/test`, {});
    $q.notify({ type: 'positive', message: t('aipr.providers.notify.testSuccess', { login: result.login, name: result.name }), position: 'top-right' });
  } catch (err: any) {
    $q.notify({ type: 'negative', message: err.message || t('aipr.providers.notify.testFailed'), position: 'top-right' });
  } finally {
    isTesting.value[id] = false;
  }
}

async function deleteProvider(id: number) {
  $q.dialog({
    title: t('aipr.common.confirm'),
    message: t('aipr.providers.deleteConfirm'),
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await api.delete(`/admin/providers/${id}`);
      $q.notify({ type: 'positive', message: t('aipr.providers.notify.deleted'), position: 'top-right' });
      await fetchProviders();
    } catch (err: any) {
      $q.notify({ type: 'negative', message: err.message || t('aipr.providers.notify.deleteFailed'), position: 'top-right' });
    }
  });
}

onMounted(fetchProviders);
</script>

<template>
  <div class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">{{ t('aipr.providers.title') }}</h1>
        <p class="text-caption text-grey-7 q-my-none">{{ t('aipr.providers.subtitle') }}</p>
      </div>
      <q-btn unelevated color="primary" icon="add" :label="t('aipr.providers.addProvider')" @click="showAddDialog = true" />
    </div>

    <q-spinner v-if="isLoading" color="primary" size="2rem" class="q-mt-lg" />

    <div v-else-if="providers.length === 0" class="text-grey-6 text-center q-mt-xl">
      {{ t('aipr.providers.empty') }}
    </div>

    <q-list v-else bordered separator class="rounded-borders shadow-1">
      <q-item v-for="p in providers" :key="p.id" class="q-py-md">
        <q-item-section avatar>
          <q-icon :name="p.type === 'GITLAB' ? 'hub' : 'code'" :color="p.type === 'GITLAB' ? 'orange' : 'purple'" size="2rem" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-bold">{{ p.displayName }}</q-item-label>
          <q-item-label caption>{{ p.baseUrl }}</q-item-label>
          <q-item-label caption class="text-grey-6 font-mono">{{ t('aipr.providers.tokenPrefix') }} {{ p.token }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row q-gutter-xs items-center">
            <q-badge :color="p.type === 'GITLAB' ? 'orange' : 'purple'" :label="p.type" />
            <q-badge color="grey-5" :label="`${p._count.repositories} ${t('aipr.common.repos')}`" text-color="grey-9" />
          </div>
          <div class="row q-gutter-xs q-mt-sm justify-end">
            <q-btn
              flat dense size="sm" icon="wifi_tethering" color="positive"
              :loading="isTesting[p.id]"
              @click="testProvider(p.id)"
            >
              <q-tooltip>{{ t('aipr.providers.testConnection') }}</q-tooltip>
            </q-btn>
            <q-btn flat dense size="sm" icon="delete" color="negative" @click="deleteProvider(p.id)">
              <q-tooltip>{{ t('aipr.common.delete') }}</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Add Provider Dialog -->
    <q-dialog v-model="showAddDialog" persistent>
      <q-card style="min-width: 420px;">
        <q-card-section>
          <div class="text-h6">{{ t('aipr.providers.addDialogTitle') }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-form @submit.prevent="addProvider" class="q-gutter-md">
            <q-select
              v-model="form.type"
              :options="['GITLAB', 'GITHUB']"
              :label="t('aipr.common.type')"
              outlined dense
            />
            <q-input v-model="form.displayName" :label="t('aipr.common.name')" outlined dense required />
            <q-input v-model="form.baseUrl" :label="t('aipr.common.baseUrl')" outlined dense required
              :hint="t('aipr.providers.baseUrlHint')"
            />
            <q-input
              v-model="form.token"
              :label="t('aipr.common.patToken')"
              type="password"
              outlined dense required
              :hint="t('aipr.providers.patHint')"
            />
            <div class="row justify-end q-gutter-sm q-mt-sm">
              <q-btn flat :label="t('aipr.common.cancel')" color="grey-7" @click="showAddDialog = false" />
              <q-btn unelevated :label="t('aipr.common.add')" color="primary" type="submit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.rounded-borders { border-radius: 8px; }
.font-mono { font-family: monospace; font-size: 11px; }
</style>
