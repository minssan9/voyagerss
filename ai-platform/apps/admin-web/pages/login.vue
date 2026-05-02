<script setup lang="ts">
definePageMeta({ layout: 'blank' });

const config = useRuntimeConfig();
const auth   = useAuthStore();
const router = useRouter();
const toast  = useToast();

const form   = reactive({ email: '', password: '' });
const error  = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await $fetch<{ accessToken: string; refreshToken: string }>(
      `${config.public.apiUrl}/api/auth/login`,
      { method: 'POST', body: form },
    );
    auth.setTokens(res.accessToken, res.refreshToken);
    toast.success('로그인되었습니다.');
    await router.push('/issues');
  } catch (e: any) {
    error.value = e?.data?.message ?? '이메일 또는 비밀번호가 올바르지 않습니다.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="card p-8">
      <!-- Logo -->
      <div class="mb-8 text-center">
        <h1 class="text-xl font-700 tracking-tight text-[#111]">Auto‑PR</h1>
        <p class="text-sm text-muted mt-1">Admin Dashboard</p>
      </div>

      <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label for="email" class="text-xs font-500 text-[#111]">이메일</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            class="input"
            autocomplete="email"
            placeholder="admin@example.com"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="pw" class="text-xs font-500 text-[#111]">비밀번호</label>
          <input
            id="pw"
            v-model="form.password"
            type="password"
            class="input"
            autocomplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <p v-if="error" class="text-xs text-[#ff3b30] -mt-2" role="alert">{{ error }}</p>

        <button
          type="submit"
          class="btn btn-primary w-full justify-center mt-1"
          :disabled="loading"
          :aria-busy="loading"
        >
          {{ loading ? '로그인 중…' : '로그인' }}
        </button>
      </form>
    </div>
  </div>
</template>
