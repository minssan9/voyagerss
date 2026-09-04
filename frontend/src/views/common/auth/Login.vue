<template>
  <q-page class="column items-center justify-center q-pa-md auth-page">
    <div class="auth-container card q-pa-lg">
      <!-- Service selector -->
      <q-tabs
        v-model="activeService"
        class="q-mb-sm text-grey-7"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
        @update:model-value="onServiceChange"
      >
        <q-tab name="workschd" label="상조근무" icon="work" />
        <q-tab name="aipr" label="Auto-PR" icon="settings_suggest" />
        <q-tab name="investand" label="Investand" icon="show_chart" />
      </q-tabs>

      <q-separator class="q-mb-lg" />

      <q-tab-panels v-model="activeService" animated keep-alive>
        <!-- ── Workschd ── -->
        <q-tab-panel name="workschd" class="q-pa-none">
          <div class="column items-center q-gutter-y-md">
            <q-btn class="social-login-btn" flat :href="getSocialLoginUrl('kakao')">
              <img
                :src="`${VITE_CDN_URL}/website/button/kakao-signin-korean.png`"
                width="300"
                height="45"
                alt="카카오 로그인"
              />
            </q-btn>
            <q-btn class="social-login-btn" flat :href="getSocialLoginUrl('google')">
              <img
                :src="`${VITE_CDN_URL}/website/button/google-signin-korean.png`"
                width="300"
                height="45"
                alt="구글 로그인"
              />
            </q-btn>
            <q-btn class="social-login-btn" flat :href="getSocialLoginUrl('naver')">
              <img
                :src="`${VITE_CDN_URL}/website/button/naver-signin-korean.png`"
                width="300"
                height="45"
                style="border-radius: 8px"
                alt="네이버 로그인"
              />
            </q-btn>
          </div>

          <q-separator class="q-my-lg" />

          <div class="email-login-form q-pa-md">
            <h5 class="text-center q-mb-md">{{ t('login.title', '로그인') }}</h5>
            <q-form @submit="handleWorkschdLogin" class="q-gutter-md">
              <q-input
                v-model="workschdForm.email"
                :label="t('login.email.label', '이메일')"
                type="email"
                outlined
                class="auth-input"
                :rules="[
                  val => !!val || t('login.validation.required', '필수 입력 항목입니다'),
                  val => isValidEmail(val) || t('login.validation.email', '올바른 이메일 형식이 아닙니다')
                ]"
              >
                <template v-slot:prepend><q-icon name="email" /></template>
              </q-input>

              <q-input
                v-model="workschdForm.password"
                :label="t('login.password.label', '비밀번호')"
                type="password"
                outlined
                class="login-input"
                :rules="[val => !!val || t('login.validation.required', '필수 입력 항목입니다')]"
              >
                <template v-slot:prepend><q-icon name="lock" /></template>
              </q-input>

              <div class="row justify-between q-mt-md">
                <q-checkbox v-model="rememberMe" :label="t('login.form.rememberMe', '로그인 상태 유지')" />
                <q-btn flat color="primary" :label="t('login.form.forgotPassword', '비밀번호 찾기')" class="q-px-sm" />
              </div>

              <q-btn
                type="submit"
                color="primary"
                :label="t('login.button.submit', '로그인')"
                class="full-width q-py-sm q-mt-lg"
                size="lg"
              />

              <div class="row justify-center q-mt-md">
                <span class="text-grey-7">{{ t('login.signup.prompt', '계정이 없으신가요?') }}</span>
                <q-btn
                  flat dense color="primary" class="q-px-sm"
                  :label="t('login.signup.link', '회원가입')"
                  @click="router.push('/signup')"
                />
              </div>
            </q-form>
          </div>
        </q-tab-panel>

        <!-- ── Auto-PR (AIPR) ── -->
        <q-tab-panel name="aipr" class="q-pa-none">
          <div class="text-center q-pb-sm q-pt-md">
            <div class="text-h6 text-weight-bold">Auto‑PR</div>
            <div class="text-caption text-grey-7 q-mt-xs">Admin Dashboard</div>
          </div>

          <q-form @submit.prevent="handleAiprLogin" class="q-gutter-md q-pa-md">
            <q-input
              v-model="aiprForm.email"
              label="이메일"
              type="email"
              outlined
              dense
              autocomplete="email"
              placeholder="admin@example.com"
              :disable="aiprLoading"
            >
              <template v-slot:prepend><q-icon name="email" /></template>
            </q-input>

            <q-input
              v-model="aiprForm.password"
              label="비밀번호"
              type="password"
              outlined
              dense
              autocomplete="current-password"
              placeholder="••••••••"
              :disable="aiprLoading"
            >
              <template v-slot:prepend><q-icon name="lock" /></template>
            </q-input>

            <div v-if="aiprError" class="text-negative text-caption q-mt-sm">{{ aiprError }}</div>

            <q-btn
              type="submit"
              label="로그인"
              color="primary"
              class="full-width q-mt-md"
              :loading="aiprLoading"
              unelevated
            />
          </q-form>
        </q-tab-panel>

        <!-- ── Investand Admin ── -->
        <q-tab-panel name="investand" class="q-pa-none">
          <div class="text-center q-pt-md q-pb-sm">
            <div class="text-h6 text-weight-bold text-primary">
              🛠️ Admin {{ investandMode === 'signup' ? 'Signup' : 'Login' }}
            </div>
            <div class="text-caption text-grey-7">investand</div>
          </div>

          <q-tabs
            v-model="investandMode"
            class="text-grey-6 q-mb-md"
            active-color="primary"
            indicator-color="primary"
            align="justify"
            narrow-indicator
          >
            <q-tab name="login" label="로그인" />
            <q-tab name="signup" label="계정 생성" />
          </q-tabs>

          <div class="q-pa-md">
            <!-- Investand Login -->
            <q-form v-if="investandMode === 'login'" @submit="handleInvestandLogin" class="q-gutter-md">
              <q-input
                v-model="investandLoginForm.username"
                type="text"
                label="사용자명"
                filled
                :rules="[val => !!val || '사용자명을 입력해주세요']"
                autocomplete="username"
              >
                <template v-slot:prepend><q-icon name="person" /></template>
              </q-input>

              <q-input
                v-model="investandLoginForm.password"
                :type="showPassword ? 'text' : 'password'"
                label="비밀번호"
                filled
                :rules="[val => !!val || '비밀번호를 입력해주세요']"
                autocomplete="current-password"
                @keyup.enter="handleInvestandLogin"
              >
                <template v-slot:prepend><q-icon name="lock" /></template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="row items-center q-mt-md">
                <q-checkbox v-model="investandRememberMe" label="로그인 상태 유지" color="primary" />
              </div>

              <q-btn
                type="submit"
                color="primary"
                size="lg"
                class="full-width q-mt-lg"
                label="로그인"
                :loading="investandLogging"
                :disable="!investandLoginForm.username || !investandLoginForm.password"
              />
            </q-form>

            <!-- Investand Signup -->
            <q-form v-else @submit="handleInvestandSignup" class="q-gutter-md">
              <q-input
                v-model="investandSignupForm.username"
                type="text"
                label="사용자명 (3-50자)"
                filled
                :rules="[
                  val => !!val || '사용자명을 입력해주세요',
                  val => val.length >= 3 || '사용자명은 3자 이상이어야 합니다',
                  val => val.length <= 50 || '사용자명은 50자 이하여야 합니다'
                ]"
                autocomplete="username"
              >
                <template v-slot:prepend><q-icon name="person" /></template>
              </q-input>

              <q-input
                v-model="investandSignupForm.email"
                type="email"
                label="이메일"
                filled
                :rules="[
                  val => !!val || '이메일을 입력해주세요',
                  val => /.+@.+\..+/.test(val) || '유효한 이메일을 입력해주세요'
                ]"
                autocomplete="email"
              >
                <template v-slot:prepend><q-icon name="email" /></template>
              </q-input>

              <div class="row q-gutter-sm">
                <q-input v-model="investandSignupForm.firstName" type="text" label="이름 (선택)" filled class="col" autocomplete="given-name">
                  <template v-slot:prepend><q-icon name="badge" /></template>
                </q-input>
                <q-input v-model="investandSignupForm.lastName" type="text" label="성 (선택)" filled class="col" autocomplete="family-name">
                  <template v-slot:prepend><q-icon name="badge" /></template>
                </q-input>
              </div>

              <q-input
                v-model="investandSignupForm.password"
                :type="showPassword ? 'text' : 'password'"
                label="비밀번호 (최소 8자)"
                filled
                :rules="[
                  val => !!val || '비밀번호를 입력해주세요',
                  val => val.length >= 8 || '비밀번호는 최소 8자 이상이어야 합니다'
                ]"
                autocomplete="new-password"
              >
                <template v-slot:prepend><q-icon name="lock" /></template>
                <template v-slot:append>
                  <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPassword = !showPassword" />
                </template>
              </q-input>

              <q-input
                v-model="investandSignupForm.confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                label="비밀번호 확인"
                filled
                :rules="[
                  val => !!val || '비밀번호 확인을 입력해주세요',
                  val => val === investandSignupForm.password || '비밀번호가 일치하지 않습니다'
                ]"
                autocomplete="new-password"
                @keyup.enter="handleInvestandSignup"
              >
                <template v-slot:prepend><q-icon name="lock" /></template>
              </q-input>

              <q-select
                v-model="investandSignupForm.role"
                :options="roleOptions"
                label="역할"
                filled
                map-options
                emit-value
              >
                <template v-slot:prepend><q-icon name="admin_panel_settings" /></template>
              </q-select>

              <q-btn
                type="submit"
                color="primary"
                size="lg"
                class="full-width q-mt-lg"
                label="계정 생성"
                :loading="investandSigning"
              />
            </q-form>

            <div class="text-center q-mt-md">
              <div class="text-caption text-grey-6">관리자 계정으로만 접근 가능합니다</div>
              <div class="text-caption text-grey-6 q-mt-xs">Demo: admin / admin123</div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import apiAccount from '@/api/account/api-account'
import { removeAllCookies } from '@/utils/cookieUtils'
import { useAiprStore } from '@/modules/aipr/store/aipr-store'
import aiprApi from '@/modules/aipr/api/api-aipr'
import { adminApi, type SignupRequest } from '@/modules/investand/api/adminApi'

const VALID_SERVICES = ['workschd', 'aipr', 'investand'] as const
type Service = typeof VALID_SERVICES[number]

const { t } = useI18n()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const VITE_CDN_URL = import.meta.env.VITE_CDN_URL
const aiprStore = useAiprStore()

// ── Service tab ──
const activeService = ref<Service>(
  VALID_SERVICES.includes(route.query.service as Service)
    ? (route.query.service as Service)
    : 'workschd'
)

function onServiceChange(svc: Service) {
  router.replace({ path: '/login', query: { service: svc } })
}

watch(() => route.query.service, (s) => {
  if (VALID_SERVICES.includes(s as Service)) activeService.value = s as Service
})

onMounted(() => {
  if (route.query.registered === '1') {
    $q.notify({ type: 'positive', message: '회원가입이 완료되었습니다. 로그인해주세요.', position: 'top' })
  }
})

// ── Workschd ──
const workschdForm = ref({ email: '', password: '' })
const rememberMe = ref(false)

function getSocialLoginUrl(socialType: string) {
  removeAllCookies()
  return apiAccount.getSocialLoginUrl(socialType, null)
}

function isValidEmail(email: string) {
  return /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/.test(email)
}

async function handleWorkschdLogin() {
  try {
    const response = await apiAccount.login({
      email: workschdForm.value.email,
      password: workschdForm.value.password,
    })
    if (response) {
      $q.notify({ type: 'positive', message: t('login.success', '로그인되었습니다.') })
      router.push('/redirect?token=' + response.data)
    }
  } catch (error: any) {
    let msg = t('login.error.default', '로그인 중 오류가 발생했습니다.')
    if (error.response?.status === 401)
      msg = t('login.error.invalid', '이메일 또는 비밀번호가 올바르지 않습니다.')
    $q.notify({ type: 'negative', message: msg })
  }
}

// ── AIPR ──
const aiprForm = ref({ email: '', password: '' })
const aiprLoading = ref(false)
const aiprError = ref('')

async function handleAiprLogin() {
  if (!aiprForm.value.email || !aiprForm.value.password) {
    $q.notify({ type: 'warning', message: '이메일과 비밀번호를 입력해주세요.', position: 'top-right' })
    return
  }
  aiprLoading.value = true
  aiprError.value = ''
  try {
    const res = await aiprApi.post<{ accessToken: string; refreshToken: string }>('/auth/login', aiprForm.value)
    aiprStore.setTokens(res.accessToken, res.refreshToken)
    $q.notify({ type: 'positive', message: '로그인에 성공했습니다.', position: 'top-right', timeout: 1000 })
    await router.push({ name: 'aipr-issues' })
  } catch (err: any) {
    aiprError.value = err.message || '이메일 또는 비밀번호가 올바르지 않습니다.'
    $q.notify({ type: 'negative', message: aiprError.value, position: 'top-right' })
  } finally {
    aiprLoading.value = false
  }
}

// ── Investand ──
const investandMode = ref<'login' | 'signup'>('login')
const showPassword = ref(false)
const investandLogging = ref(false)
const investandSigning = ref(false)
const investandRememberMe = ref(false)

const investandLoginForm = ref({ username: '', password: '' })
const investandSignupForm = ref({
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  role: 'VIEWER' as const,
})

const roleOptions = [
  { label: '뷰어 (VIEWER)', value: 'VIEWER' },
  { label: '분석가 (ANALYST)', value: 'ANALYST' },
  { label: '관리자 (ADMIN)', value: 'ADMIN' },
  { label: '슈퍼 관리자 (SUPER_ADMIN)', value: 'SUPER_ADMIN' },
]

async function handleInvestandLogin() {
  if (!investandLoginForm.value.username || !investandLoginForm.value.password) return
  investandLogging.value = true
  try {
    const response = await adminApi.login(investandLoginForm.value.username, investandLoginForm.value.password)
    const storage = investandRememberMe.value ? localStorage : sessionStorage
    storage.setItem('admin_token', response.token)
    storage.setItem('admin_user', JSON.stringify(response.user))
    $q.notify({ type: 'positive', message: '로그인되었습니다.', caption: `환영합니다, ${response.user.username}님!` })
    router.push({ name: 'admin-dashboard' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '로그인에 실패했습니다.',
      caption: error instanceof Error ? error.message : '사용자명 또는 비밀번호를 확인해주세요.',
    })
  } finally {
    investandLogging.value = false
  }
}

async function handleInvestandSignup() {
  investandSigning.value = true
  try {
    const req: SignupRequest = {
      username: investandSignupForm.value.username,
      email: investandSignupForm.value.email,
      password: investandSignupForm.value.password,
      firstName: investandSignupForm.value.firstName || undefined,
      lastName: investandSignupForm.value.lastName || undefined,
      role: investandSignupForm.value.role,
    }
    const response = await adminApi.signup(req)
    $q.notify({ type: 'positive', message: '계정이 성공적으로 생성되었습니다.', caption: `환영합니다, ${response.user.username}님! 로그인해주세요.` })
    investandSignupForm.value = { username: '', email: '', firstName: '', lastName: '', password: '', confirmPassword: '', role: 'VIEWER' }
    investandLoginForm.value.username = response.user.username
    investandMode.value = 'login'
  } catch (error) {
    $q.notify({ type: 'negative', message: '계정 생성에 실패했습니다.', caption: error instanceof Error ? error.message : '입력 정보를 확인해주세요.' })
  } finally {
    investandSigning.value = false
  }
}
</script>
