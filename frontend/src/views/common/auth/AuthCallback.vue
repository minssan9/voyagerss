<template>
  <div class="callback-page">
    <div v-if="error" class="error-state">
      <div class="error-icon">✕</div>
      <p class="error-msg">로그인에 실패했습니다.</p>
      <button class="retry-btn" @click="goLogin">다시 시도</button>
    </div>
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p class="loading-msg">로그인 처리 중...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/common/store_user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const error = ref(false);

onMounted(async () => {
  const accessToken = route.query.accessToken as string | undefined;
  const refreshToken = route.query.refreshToken as string | undefined;
  const oauthError = route.query.error as string | undefined;

  if (oauthError || !accessToken) {
    error.value = true;
    return;
  }

  try {
    userStore.setAccessToken(accessToken);
    if (refreshToken) userStore.setRefreshToken(refreshToken);
    await userStore.login(accessToken);
    await userStore.fetchUser();
    router.replace('/workschd/funeral-board');
  } catch (e) {
    console.error('Auth callback error:', e);
    error.value = true;
  }
});

function goLogin() {
  router.replace('/workschd/login');
}
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #d2d2d7;
  border-top-color: #1d1d1f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-msg {
  font-size: 15px;
  color: #6e6e73;
  margin: 0;
}

.error-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fce4ec;
  color: #c62828;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-msg {
  font-size: 15px;
  color: #1d1d1f;
  margin: 0;
}

.retry-btn {
  background: #1d1d1f;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
