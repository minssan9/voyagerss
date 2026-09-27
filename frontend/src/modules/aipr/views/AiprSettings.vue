<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const $q = useQuasar();
const router = useRouter();
const { t } = useI18n();

const form = reactive({ repoFullName: '', baseBranch: 'main', origin: '' });
const isSavingRepo = ref(false);
const isAddingOrigin = ref(false);

interface Origin { id: string; origin: string; }
const originsList = ref<Origin[]>([]);

async function fetchOrigins() {
  try {
    originsList.value = await api.get<Origin[]>('/admin/origins');
  } catch { /* ignore */ }
}

async function saveRepo() {
  if (!form.repoFullName) return;
  isSavingRepo.value = true;
  try {
    localStorage.setItem('default_repo', JSON.stringify({
      repoFullName: form.repoFullName,
      baseBranch: form.baseBranch
    }));
    $q.notify({
      type: 'positive',
      message: t('aipr.settings.defaultRepoSaved', { repo: form.repoFullName }),
      position: 'top-right',
    });
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || t('aipr.common.saveFailed'),
      position: 'top-right',
    });
  } finally {
    isSavingRepo.value = false;
  }
}

async function addOrigin() {
  if (!form.origin) return;
  isAddingOrigin.value = true;
  try {
    const added = await api.post<Origin>('/admin/origins', { origin: form.origin });
    originsList.value.push(added);
    $q.notify({
      type: 'positive',
      message: t('aipr.settings.originAdded'),
      position: 'top-right',
    });
    form.origin = '';
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || t('aipr.settings.originAddFailed'),
      position: 'top-right',
    });
  } finally {
    isAddingOrigin.value = false;
  }
}

onMounted(() => {
  fetchOrigins();
  try {
    const stored = localStorage.getItem('default_repo');
    if (stored) {
      const parsed = JSON.parse(stored);
      form.repoFullName = parsed.repoFullName || '';
      form.baseBranch = parsed.baseBranch || 'main';
    }
  } catch { /* ignore */ }
});
</script>

<template>
  <div class="q-pa-md" style="max-width: 600px; margin: 0 auto;">
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        color="primary"
        @click="router.push({ name: 'aipr-issues' })"
        class="q-mr-sm"
      />
      <h1 class="text-h5 text-weight-bold q-my-none">{{ t('aipr.settings.title') }}</h1>
    </div>

    <!-- Repository settings -->
    <q-card flat bordered class="q-mb-md rounded-borders">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">{{ t('aipr.settings.githubRepo') }}</div>
        <p class="text-caption text-grey-7 q-mb-md">
          {{ t('aipr.settings.githubRepoDesc') }}
        </p>

        <q-form @submit.prevent="saveRepo" class="q-gutter-md">
          <q-input
            v-model="form.repoFullName"
            :label="t('aipr.common.repository') + ' (owner/repo)'"
            :placeholder="t('aipr.settings.repoPlaceholder')"
            outlined
            dense
            required
            :disable="isSavingRepo"
          />

          <q-input
            v-model="form.baseBranch"
            :label="t('aipr.common.baseBranch')"
            :placeholder="t('aipr.settings.branchPlaceholder')"
            outlined
            dense
            required
            :disable="isSavingRepo"
          />

          <q-btn
            type="submit"
            :label="t('aipr.common.save')"
            color="primary"
            :loading="isSavingRepo"
            unelevated
            class="q-px-md"
          />
        </q-form>
      </q-card-section>
    </q-card>

    <!-- Allowed widget origins list -->
    <q-card flat bordered class="rounded-borders">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">{{ t('aipr.settings.widgetOrigins') }}</div>
        <p class="text-caption text-grey-7 q-mb-md">
          {{ t('aipr.settings.widgetOriginsDesc') }}
        </p>

        <q-form @submit.prevent="addOrigin" class="row q-col-gutter-sm q-mb-md">
          <div class="col-grow">
            <q-input
              v-model="form.origin"
              :placeholder="t('aipr.settings.originPlaceholder')"
              type="url"
              outlined
              dense
              required
              :disable="isAddingOrigin"
            />
          </div>
          <div class="col-auto">
            <q-btn
              type="submit"
              :label="t('aipr.common.add')"
              color="primary"
              :loading="isAddingOrigin"
              unelevated
              style="height: 40px;"
            />
          </div>
        </q-form>

        <q-list bordered separator class="rounded-borders" v-if="originsList.length">
          <q-item v-for="o in originsList" :key="o.id">
            <q-item-section avatar class="min-width-none q-pr-sm">
              <q-icon name="circle" color="green" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="font-mono text-caption">{{ o.origin }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.rounded-borders {
  border-radius: 8px;
}
.min-width-none {
  min-width: unset;
}
.font-mono {
  font-family: monospace;
}
</style>
