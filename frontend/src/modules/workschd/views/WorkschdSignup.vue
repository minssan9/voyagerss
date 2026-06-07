<template>
  <div class="signup-page">
    <div class="signup-card">
      <div class="brand">
        <div class="brand-icon">상</div>
        <h1 class="brand-name">회원가입</h1>
        <p class="brand-sub">상조 근무 플랫폼</p>
      </div>

      <div class="divider"></div>

      <form class="form" @submit.prevent="submit">
        <input
          v-model="username"
          type="text"
          class="input-field"
          placeholder="이름"
          required
          autocomplete="name"
        />
        <input
          v-model="email"
          type="email"
          class="input-field"
          placeholder="이메일"
          required
          autocomplete="email"
        />
        <input
          v-model="password"
          type="password"
          class="input-field"
          placeholder="비밀번호 (8자 이상)"
          minlength="8"
          required
          autocomplete="new-password"
        />
        <input
          v-model="passwordConfirm"
          type="password"
          class="input-field"
          placeholder="비밀번호 확인"
          required
          autocomplete="new-password"
        />

        <div v-if="error" class="error-notice">{{ error }}</div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '가입 중…' : '회원가입' }}
        </button>
      </form>

      <p class="login-note">
        이미 계정이 있으신가요?
        <router-link to="/login?service=workschd" class="link">로그인</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

const username = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const error = ref('');

const API_URL = import.meta.env.VITE_API_URL || '';

async function submit() {
  error.value = '';

  if (password.value !== passwordConfirm.value) {
    error.value = '비밀번호가 일치하지 않습니다.';
    return;
  }

  loading.value = true;
  try {
    await axios.post(`${API_URL}/api/workschd/auth/signup`, {
      email: email.value,
      password: password.value,
      username: username.value,
    });
    router.push('/login?service=workschd&registered=1');
  } catch (e: any) {
    if (e.response?.status === 409) {
      error.value = '이미 사용 중인 이메일입니다.';
    } else {
      error.value = e.response?.data?.message || '회원가입에 실패했습니다.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.signup-page {
  min-height: 100vh;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.signup-card {
  background: #fff;
  border-radius: 24px;
  padding: 48px 40px 36px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}

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

.divider {
  height: 1px;
  background: #f2f2f7;
  margin: 0 0 28px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-field {
  width: 100%;
  padding: 13px 16px;
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.input-field:focus {
  border-color: #0071e3;
}

.error-notice {
  background: #fce4ec;
  color: #c62828;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  text-align: center;
}

.submit-btn {
  width: 100%;
  padding: 14px 20px;
  border-radius: 14px;
  background: #1d1d1f;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) { opacity: 0.85; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.login-note {
  font-size: 13px;
  color: #6e6e73;
  text-align: center;
  margin: 20px 0 0;
}

.link {
  color: #0071e3;
  text-decoration: none;
}
</style>
