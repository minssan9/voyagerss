<template>
  <div class="column items-center justify-center q-pa-md auth-page">
    <div class="auth-container card q-pa-lg">
      <div class="column items-center q-gutter-y-md">
        <q-btn
          class="social-login-btn social-login-btn--kakao"
          unelevated
          no-caps
          type="a"
          :href="getSocialLoginUrl('kakao')"
        >
          <img src="/brand/kakao.svg" width="20" height="20" alt="" />
          <span class="q-ml-sm">{{ t('oauth.kakao') }}</span>
        </q-btn>
        <q-btn
          class="social-login-btn social-login-btn--google"
          unelevated
          no-caps
          type="a"
          :href="getSocialLoginUrl('google')"
        >
          <img src="/brand/google.svg" width="20" height="20" alt="" />
          <span class="q-ml-sm">{{ t('oauth.google') }}</span>
        </q-btn>
      </div>

      <q-separator class="q-my-lg" />

      <div class="email-login-form q-pa-md">
        <h5 class="text-center q-mb-md">{{ t('login.title') }}</h5>
        <q-form @submit="handleLogin" class="q-gutter-md">
          <q-input
            v-model="form.email"
            :label="t('login.email.label')"
            type="email"
            outlined
            class="auth-input"
            :rules="[
              val => !!val || t('login.validation.required'),
              val => isValidEmail(val) || t('login.validation.email')
            ]"
          >
            <template v-slot:prepend><q-icon name="email" /></template>
          </q-input>

          <q-input
            v-model="form.password"
            :label="t('login.password.label')"
            :type="showPassword ? 'text' : 'password'"
            outlined
            class="login-input"
            :rules="[val => !!val || t('login.validation.required')]"
          >
            <template v-slot:prepend><q-icon name="lock" /></template>
            <template v-slot:append>
              <q-btn
                flat
                dense
                round
                type="button"
                color="grey-9"
                :icon="showPassword ? 'visibility_off' : 'visibility'"
                :aria-label="showPassword ? t('passwordVisibility.hide') : t('passwordVisibility.show')"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <div class="row justify-between q-mt-md">
            <q-checkbox v-model="rememberMe" :label="t('login.form.rememberMe')" />
            <q-btn flat color="primary" :label="t('login.form.forgotPassword')" class="q-px-sm" />
          </div>

          <q-btn
            type="submit"
            color="primary"
            :label="t('login.button.submit')"
            class="full-width q-py-sm q-mt-lg"
            size="lg"
            :loading="loading"
          />

          <div class="row justify-center q-mt-md">
            <span class="text-grey-7">{{ t('login.signup.prompt') }}</span>
            <q-btn
              flat dense color="primary" class="q-px-sm"
              :label="t('login.signup.link')"
              @click="router.push('/signup')"
            />
          </div>
        </q-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import service from '@/api/common/axios-voyagerss.js'
import { removeAllCookies } from '@/utils/cookieUtils'
import { useUserStore } from '@/stores/common/store_user'

const { t } = useI18n()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

const form = ref({ email: '', password: '' })
const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)

function getSocialLoginUrl(provider: 'google' | 'kakao') {
  removeAllCookies()
  return `${apiBase}/identity/auth/${provider}`
}

function isValidEmail(email: string) {
  return /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/.test(email)
}

async function handleLogin() {
  loading.value = true
  try {
    const response = await service.post<{ accessToken: string; refreshToken: string }>(
      '/identity/auth/login',
      { email: form.value.email, password: form.value.password },
    )
    const { accessToken, refreshToken } = response.data
    userStore.setAccessToken(accessToken)
    if (refreshToken) userStore.setRefreshToken(refreshToken)
    await userStore.login(accessToken)
    await userStore.fetchUser()
    $q.notify({ type: 'positive', message: t('login.success') })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const fallback = userStore.isWorker ? '/workschd/m/tasks' : '/'
    router.replace(redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : fallback)
  } catch (error: any) {
    let msg = t('login.error.default')
    if (error.response?.status === 401) {
      msg = t('login.error.invalid')
    }
    $q.notify({ type: 'negative', message: msg })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.query.registered === '1') {
    $q.notify({ type: 'positive', message: t('signup.success'), position: 'top' })
  }
})
</script>
