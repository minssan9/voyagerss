<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo / Brand -->
      <div class="brand">
        <div class="brand-icon">상</div>
        <h1 class="brand-name">상조 근무 플랫폼</h1>
        <p class="brand-sub">인천 · 부천 장례 근무 스케줄 관리</p>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Social Login -->
      <div class="social-section">
        <p class="social-hint">소셜 계정으로 빠르게 시작하세요</p>

        <button class="social-btn google" @click="loginWithGoogle">
          <svg class="social-icon" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 로그인
        </button>

        <button class="social-btn kakao" @click="loginWithKakao">
          <svg class="social-icon" viewBox="0 0 24 24" fill="#3C1E1E">
            <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.8 1.68 5.26 4.2 6.74l-.84 3.12 3.64-2.4A11.38 11.38 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/>
          </svg>
          카카오로 로그인
        </button>
      </div>

      <!-- Error message -->
      <div v-if="oauthError" class="error-notice">
        로그인에 실패했습니다. 다시 시도해 주세요.
      </div>

      <!-- Footer note -->
      <p class="footer-note">
        로그인하면 <a href="/terms" class="link">이용약관</a> 및
        <a href="/privacy-policy" class="link">개인정보처리방침</a>에 동의하게 됩니다.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const oauthError = computed(() => route.query.error === 'oauth_failed');

const API_URL = import.meta.env.VITE_API_URL || '';

function loginWithGoogle() {
  window.location.href = `${API_URL}/api/workschd/auth/google`;
}

function loginWithKakao() {
  window.location.href = `${API_URL}/api/workschd/auth/kakao`;
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.login-card {
  background: #fff;
  border-radius: 24px;
  padding: 48px 40px 36px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

/* ── Brand ── */
.brand {
  text-align: center;
  margin-bottom: 32px;
}

.brand-icon {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #1d1d1f;
  color: #fff;
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.brand-sub {
  font-size: 14px;
  color: #6e6e73;
  margin: 0;
}

/* ── Divider ── */
.divider {
  height: 1px;
  background: #f2f2f7;
  margin: 0 0 28px;
}

/* ── Social ── */
.social-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.social-hint {
  font-size: 13px;
  color: #aeaeb2;
  text-align: center;
  margin: 0 0 4px;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}

.social-btn:hover { opacity: 0.85; }

.social-btn.google {
  background: #fff;
  color: #1d1d1f;
  border: 1px solid #d2d2d7;
}

.social-btn.kakao {
  background: #FEE500;
  color: #3C1E1E;
}

.social-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* ── Error ── */
.error-notice {
  margin-top: 16px;
  background: #fce4ec;
  color: #c62828;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  text-align: center;
}

/* ── Footer ── */
.footer-note {
  font-size: 11px;
  color: #aeaeb2;
  text-align: center;
  line-height: 1.6;
  margin: 24px 0 0;
}

.link {
  color: #0071e3;
  text-decoration: none;
}
</style>
