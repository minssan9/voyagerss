<template>
  <WorkschdPage
    :title="t('systemConfig.title')"
    :subtitle="t('systemConfig.subtitle')"
    test-id="admin-system-config"
  >
    <template #actions>
      <q-btn
        class="workschd-btn q-mr-sm"
        unelevated
        no-caps
        dense
        icon="refresh"
        :label="t('systemConfig.reloadCache')"
        :loading="reloading"
        @click="reloadCache"
      />
      <q-btn
        class="workschd-btn"
        unelevated
        no-caps
        dense
        color="primary"
        icon="save"
        :label="t('systemConfig.saveAll')"
        :loading="saving"
        @click="saveAll"
      />
    </template>

    <q-banner v-if="loadError" class="bg-negative text-white q-mb-md" rounded>
      {{ loadError }}
    </q-banner>

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1">{{ t('systemConfig.apiKeysSection') }}</div>
        <div class="text-caption text-grey-7">{{ t('systemConfig.apiKeysHint') }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-md">
        <div v-for="field in apiKeyFields" :key="field.key" class="q-mb-lg">
          <ApiKeyAcquisitionGuide :config-key="field.key" />
          <q-input
            v-model="values[field.key]"
            :type="field.isSecret ? 'password' : 'text'"
            :label="field.key"
            :hint="field.description ?? undefined"
            outlined
            dense
            autocomplete="off"
            class="q-mt-sm"
            :data-testid="`config-input-${field.key}`"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="text-subtitle1">{{ t('systemConfig.primaryDataSection') }}</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-md">
        <q-toggle
          v-model="ingestionEnabled"
          :label="t('systemConfig.ingestionEnabled')"
          color="primary"
        />
        <q-input
          v-model="values.PD_INGESTION_CRON"
          :label="'PD_INGESTION_CRON'"
          outlined
          dense
        />
        <q-input
          v-model="values.PD_INGESTION_TIMEZONE"
          :label="'PD_INGESTION_TIMEZONE'"
          outlined
          dense
        />
        <q-input
          v-model="values.PD_KOREA_TRADE_UNIVERSE_JSON"
          type="textarea"
          :label="'PD_KOREA_TRADE_UNIVERSE_JSON'"
          :hint="t('systemConfig.tradeUniverseHint')"
          outlined
          autogrow
        />
        <q-input
          v-model="values.PD_TWSE_SYMBOLS"
          :label="'PD_TWSE_SYMBOLS'"
          :hint="t('systemConfig.twseSymbolsHint')"
          outlined
          dense
        />
        <q-input
          v-model="values.PD_FRED_CREDIT_SERIES"
          :label="'PD_FRED_CREDIT_SERIES'"
          outlined
          dense
        />
      </q-card-section>
    </q-card>
  </WorkschdPage>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import WorkschdPage from '@/modules/workschd/components/WorkschdPage.vue';
import ApiKeyAcquisitionGuide from '@/modules/workschd/components/admin/ApiKeyAcquisitionGuide.vue';
import {
  ensureConfigCatalog,
  fetchConfigCatalog,
  fetchConfigValue,
  reloadSystemConfig,
  saveConfigValue,
  type ConfigCatalogItem,
} from '@/modules/workschd/api/api-system-config';

const { t } = useI18n();
const $q = useQuasar();

const catalog = ref<ConfigCatalogItem[]>([]);
const values = reactive<Record<string, string>>({});
const saving = ref(false);
const reloading = ref(false);
const loadError = ref('');

const CATEGORIES = ['finance', 'primary_data'];

const API_KEY_KEYS = new Set(['DART_API_KEY', 'FRED_API_KEY', 'DATA_GO_KR_SERVICE_KEY']);

const apiKeyFields = computed(() => catalog.value.filter((c) => API_KEY_KEYS.has(c.key)));

const ingestionEnabled = computed({
  get: () => values.PD_INGESTION_ENABLED === 'true',
  set: (v: boolean) => {
    values.PD_INGESTION_ENABLED = v ? 'true' : 'false';
  },
});

async function loadPage(): Promise<void> {
  loadError.value = '';
  try {
    await ensureConfigCatalog(CATEGORIES);
    catalog.value = await fetchConfigCatalog(CATEGORIES);
    for (const item of catalog.value) {
      const detail = await fetchConfigValue(item.key);
      values[item.key] = detail?.value ?? '';
    }
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : String(e);
  }
}

async function saveAll(): Promise<void> {
  saving.value = true;
  try {
    for (const item of catalog.value) {
      const value = values[item.key] ?? '';
      await saveConfigValue(item.key, {
        value,
        description: item.description ?? undefined,
        category: item.category,
        isEncrypted: item.isSecret,
      });
    }
    await reloadSystemConfig();
    $q.notify({ type: 'positive', message: t('systemConfig.saveSuccess') });
    await loadPage();
  } catch (e: unknown) {
    $q.notify({
      type: 'negative',
      message: e instanceof Error ? e.message : t('systemConfig.saveError'),
    });
  } finally {
    saving.value = false;
  }
}

async function reloadCache(): Promise<void> {
  reloading.value = true;
  try {
    await reloadSystemConfig();
    $q.notify({ type: 'positive', message: t('systemConfig.reloadSuccess') });
  } catch (e: unknown) {
    $q.notify({
      type: 'negative',
      message: e instanceof Error ? e.message : t('systemConfig.reloadError'),
    });
  } finally {
    reloading.value = false;
  }
}

onMounted(() => {
  void loadPage();
});
</script>
