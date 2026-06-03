<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAiprStore } from '../store/aipr-store';
import api from '../api/api-aipr';
import { useQuasar } from 'quasar';

const router = useRouter();
const store = useAiprStore();
const $q = useQuasar();

const form = reactive({ email: '', password: '' });
const isSubmitting = ref(false);
const hasError = ref(false);
const errorMessage = ref('');

async function handleLogin() {
  if (!form.email || !form.password) {
    $q.notify({
      type: 'warning',
      message: '이메일과 비밀번호를 입력해주세요.',
      position: 'top-right',
    });
    return;
  }

  isSubmitting.value = true;
  hasError.value = false;
  errorMessage.value = '';

  try {
    const res = await api.post<{ accessToken: string; refreshToken: string }>('/auth/login', form);
    store.setTokens(res.accessToken, res.refreshToken);
    $q.notify({
      type: 'positive',
      message: '로그인에 성공했습니다.',
      position: 'top-right',
      timeout: 1000,
    });
    await router.push({ name: 'aipr-issues' });
  } catch (err: any) {
    hasError.value = true;
    errorMessage.value = err.message || '이메일 또는 비밀번호가 올바르지 않습니다.';
    $q.notify({
      type: 'negative',
      message: errorMessage.value,
      position: 'top-right',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="row justify-center items-center" style="min-height: 80vh;">
    <div class="col-xs-12 col-sm-6 col-md-4" style="max-width: 400px;">
      <q-card class="q-pa-lg shadow-2 rounded-borders">
        <q-card-section class="text-center">
          <h1 class="text-h5 text-weight-bold q-my-none">Auto‑PR</h1>
          <p class="text-subtitle2 text-grey-7 q-mt-xs q-mb-none">Admin Dashboard</p>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="handleLogin" class="q-gutter-md">
            <q-input
              v-model="form.email"
              label="이메일"
              type="email"
              outlined
              dense
              autocomplete="email"
              placeholder="admin@example.com"
              :disable="isSubmitting"
            >
              <template v-slot:prepend>
                <q-icon name="email" />
              </template>
            </q-input>

            <q-input
              v-model="form.password"
              label="비밀번호"
              type="password"
              outlined
              dense
              autocomplete="current-password"
              placeholder="••••••••"
              :disable="isSubmitting"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
            </q-input>

            <div v-if="hasError" class="text-negative text-caption q-mt-sm">
              {{ errorMessage }}
            </div>

            <q-btn
              type="submit"
              label="로그인"
              color="primary"
              class="full-width q-mt-md"
              :loading="isSubmitting"
              unelevated
            />
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style scoped>
.full-width {
  width: 100%;
}
</style>
