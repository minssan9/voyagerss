<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

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
      message: `저장소 ${form.repoFullName}가 기본값으로 설정되었습니다.`,
      position: 'top-right',
    });
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || '저장에 실패했습니다.',
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
      message: 'Origin이 추가되었습니다.',
      position: 'top-right',
    });
    form.origin = '';
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: err.message || 'Origin 추가에 실패했습니다.',
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
      <h1 class="text-h5 text-weight-bold q-my-none">Settings</h1>
    </div>

    <!-- Repository settings -->
    <q-card flat bordered class="q-mb-md rounded-borders">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">GitHub Repository</div>
        <p class="text-caption text-grey-7 q-mb-md">
          이슈 승인(Approve) 시 기본값으로 사용할 원격 저장소를 입력합니다.
        </p>

        <q-form @submit.prevent="saveRepo" class="q-gutter-md">
          <q-input
            v-model="form.repoFullName"
            label="Repository (owner/repo)"
            placeholder="myorg/my-repo"
            outlined
            dense
            required
            :disable="isSavingRepo"
          />

          <q-input
            v-model="form.baseBranch"
            label="Base Branch"
            placeholder="main"
            outlined
            dense
            required
            :disable="isSavingRepo"
          />

          <q-btn
            type="submit"
            label="저장"
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
        <div class="text-subtitle1 text-weight-bold">Widget Origin 허용 목록</div>
        <p class="text-caption text-grey-7 q-mb-md">
          피드백 위젯 iframe을 삽입하여 호출할 수 있는 도메인을 등록합니다.
        </p>

        <q-form @submit.prevent="addOrigin" class="row q-col-gutter-sm q-mb-md">
          <div class="col-grow">
            <q-input
              v-model="form.origin"
              placeholder="https://your-site.com"
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
              label="추가"
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
