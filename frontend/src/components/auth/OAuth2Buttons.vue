<template>
  <div class="oauth-buttons q-gutter-md">
    <!-- Google Login Button -->
    <q-btn
      unelevated
      class="full-width google-btn"
      @click="loginWithGoogle"
      :loading="isLoading"
    >
      <div class="row items-center full-width">
        <q-icon name="fab fa-google" size="20px" class="q-mr-sm" />
        <span>Continue with Google</span>
      </div>
    </q-btn>

    <!-- Kakao Login Button -->
    <q-btn
      unelevated
      class="full-width kakao-btn"
      @click="loginWithKakao"
      :loading="isLoading"
    >
      <div class="row items-center full-width">
        <q-icon name="chat" size="20px" class="q-mr-sm" />
        <span>Continue with Kakao</span>
      </div>
    </q-btn>

    <div class="row items-center q-mt-md">
      <q-separator class="col" />
      <span class="q-px-md text-grey-6">OR</span>
      <q-separator class="col" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isLoading = ref(false)

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const loginWithGoogle = () => {
  isLoading.value = true
  window.location.href = `${API_BASE}/api/workschd/auth/google`
}

const loginWithKakao = () => {
  isLoading.value = true
  window.location.href = `${API_BASE}/api/workschd/auth/kakao`
}
</script>

<style scoped>
.oauth-buttons {
  max-width: 400px;
  margin: 0 auto;
}

.google-btn {
  background-color: #fff;
  color: #757575;
  border: 1px solid #dadce0;
  text-transform: none;
  font-weight: 500;
  padding: 12px 16px;
}

.google-btn:hover {
  background-color: #f8f9fa;
  border-color: #d2e3fc;
  box-shadow: 0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
}

.kakao-btn {
  background-color: #FEE500;
  color: #000000;
  text-transform: none;
  font-weight: 500;
  padding: 12px 16px;
}

.kakao-btn:hover {
  background-color: #FDD835;
}

.q-btn :deep(.q-btn__content) {
  justify-content: flex-start;
}
</style>
