<template>
  <div class="flex flex-center bg-grey-2 full-height">
    <div class="login-container">
      <q-card class="login-card q-pa-lg">
        <q-card-section class="text-center">
          <div class="text-h4 text-weight-bold text-primary q-mb-md">
            🛠️ Admin {{ isSignupMode ? 'Signup' : 'Login' }}
          </div>
          <div class="text-h6 text-grey-7 q-mb-lg">
            investand
          </div>

          <!-- Mode Toggle Tabs -->
          <q-tabs
            v-model="activeTab"
            class="text-grey-6 q-mb-md"
            active-color="primary"
            indicator-color="primary"
            align="justify"
            narrow-indicator
          >
            <q-tab name="login" label="로그인" @click="setLoginMode" />
            <q-tab name="signup" label="계정 생성" @click="setSignupMode" />
          </q-tabs>
        </q-card-section>

        <q-card-section>
          <!-- Login Form -->
          <q-form v-if="!isSignupMode" @submit="handleLogin" class="q-gutter-md">
            <q-input
              v-model="loginForm.username"
              type="text"
              label="사용자명"
              filled
              :rules="[val => !!val || '사용자명을 입력해주세요']"
              autocomplete="username"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <q-input
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              label="비밀번호"
              filled
              :rules="[val => !!val || '비밀번호를 입력해주세요']"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <div class="row items-center q-mt-md">
              <q-checkbox
                v-model="rememberMe"
                label="로그인 상태 유지"
                color="primary"
              />
            </div>

            <q-btn
              type="submit"
              color="primary"
              size="lg"
              class="full-width q-mt-lg"
              label="로그인"
              :loading="logging"
              :disable="!isLoginFormValid"
            />
          </q-form>

          <!-- Signup Form -->
          <q-form v-else @submit="handleSignup" class="q-gutter-md">
            <q-input
              v-model="signupForm.username"
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
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <q-input
              v-model="signupForm.email"
              type="email"
              label="이메일"
              filled
              :rules="[
                val => !!val || '이메일을 입력해주세요',
                val => /.+@.+\..+/.test(val) || '유효한 이메일을 입력해주세요'
              ]"
              autocomplete="email"
            >
              <template v-slot:prepend>
                <q-icon name="email" />
              </template>
            </q-input>

            <div class="row q-gutter-sm">
              <q-input
                v-model="signupForm.firstName"
                type="text"
                label="이름 (선택)"
                filled
                class="col"
                autocomplete="given-name"
              >
                <template v-slot:prepend>
                  <q-icon name="badge" />
                </template>
              </q-input>

              <q-input
                v-model="signupForm.lastName"
                type="text"
                label="성 (선택)"
                filled
                class="col"
                autocomplete="family-name"
              >
                <template v-slot:prepend>
                  <q-icon name="badge" />
                </template>
              </q-input>
            </div>

            <q-input
              v-model="signupForm.password"
              :type="showPassword ? 'text' : 'password'"
              label="비밀번호 (최소 8자)"
              filled
              :rules="[
                val => !!val || '비밀번호를 입력해주세요',
                val => val.length >= 8 || '비밀번호는 최소 8자 이상이어야 합니다'
              ]"
              autocomplete="new-password"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <q-input
              v-model="signupForm.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              label="비밀번호 확인"
              filled
              :rules="[
                val => !!val || '비밀번호 확인을 입력해주세요',
                val => val === signupForm.password || '비밀번호가 일치하지 않습니다'
              ]"
              autocomplete="new-password"
              @keyup.enter="handleSignup"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
            </q-input>

            <q-select
              v-model="signupForm.role"
              :options="roleOptions"
              label="역할"
              filled
              map-options
              emit-value
            >
              <template v-slot:prepend>
                <q-icon name="admin_panel_settings" />
              </template>
            </q-select>

            <q-btn
              type="submit"
              color="primary"
              size="lg"
              class="full-width q-mt-lg"
              label="계정 생성"
              :loading="signing"
              :disable="!isSignupFormValid"
            />
          </q-form>
        </q-card-section>

        <q-card-section class="text-center">
          <div class="text-caption text-grey-6">
            관리자 계정으로만 접근 가능합니다
          </div>
          <div class="text-caption text-grey-6 q-mt-sm">
            Demo: admin / admin123
          </div>
        </q-card-section>
      </q-card>

      <!-- Background decoration -->
      <div class="bg-decoration">
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { adminApi, type SignupRequest } from '../../services/adminApi'

const router = useRouter()
const $q = useQuasar()

// Reactive data
const logging = ref(false)
const signing = ref(false)
const showPassword = ref(false)
const rememberMe = ref(false)
const isSignupMode = ref(false)
const activeTab = ref('login')

const loginForm = ref({
  username: '',
  password: ''
})

const signupForm = ref({
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  role: 'VIEWER' as const
})

const roleOptions = [
  { label: '뷰어 (VIEWER)', value: 'VIEWER' },
  { label: '분석가 (ANALYST)', value: 'ANALYST' },
  { label: '관리자 (ADMIN)', value: 'ADMIN' },
  { label: '슈퍼 관리자 (SUPER_ADMIN)', value: 'SUPER_ADMIN' }
]

// Computed
const isLoginFormValid = computed(() => {
  return loginForm.value.username.length > 0 && loginForm.value.password.length > 0
})

const isSignupFormValid = computed(() => {
  return (
    signupForm.value.username.length >= 3 &&
    signupForm.value.username.length <= 50 &&
    signupForm.value.email.length > 0 &&
    /.+@.+\..+/.test(signupForm.value.email) &&
    signupForm.value.password.length >= 8 &&
    signupForm.value.password === signupForm.value.confirmPassword
  )
})

// Methods
function setLoginMode(): void {
  isSignupMode.value = false
  activeTab.value = 'login'
}

function setSignupMode(): void {
  isSignupMode.value = true
  activeTab.value = 'signup'
}

async function handleLogin(): Promise<void> {
  if (!isLoginFormValid.value) return

  logging.value = true
  try {
    const response = await adminApi.login(
      loginForm.value.username,
      loginForm.value.password
    )

    // Store authentication token
    const storage = rememberMe.value ? localStorage : sessionStorage
    storage.setItem('admin_token', response.token)
    storage.setItem('admin_user', JSON.stringify(response.user))

    $q.notify({
      type: 'positive',
      message: '로그인되었습니다.',
      caption: `환영합니다, ${response.user.username}님!`
    })

    // Redirect to admin dashboard
    router.push({ name: 'admin-dashboard' })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '로그인에 실패했습니다.',
      caption: error instanceof Error ? error.message : '사용자명 또는 비밀번호를 확인해주세요.'
    })
  } finally {
    logging.value = false
  }
}

async function handleSignup(): Promise<void> {
  if (!isSignupFormValid.value) return

  signing.value = true
  try {
    const signupRequest: SignupRequest = {
      username: signupForm.value.username,
      email: signupForm.value.email,
      password: signupForm.value.password,
      firstName: signupForm.value.firstName || undefined,
      lastName: signupForm.value.lastName || undefined,
      role: signupForm.value.role
    }

    const response = await adminApi.signup(signupRequest)

    $q.notify({
      type: 'positive',
      message: '계정이 성공적으로 생성되었습니다.',
      caption: `환영합니다, ${response.user.username}님! 로그인해주세요.`
    })

    // Reset form and switch to login mode
    signupForm.value = {
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      role: 'VIEWER'
    }

    // Auto-fill login form with created username
    loginForm.value.username = response.user.username
    setLoginMode()

  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '계정 생성에 실패했습니다.',
      caption: error instanceof Error ? error.message : '입력 정보를 확인해주세요.'
    })
  } finally {
    signing.value = false
  }
}
</script>

<style lang="scss" scoped>
.full-height {
  min-height: 100vh;
  width: 100vw;
  position: relative;
}

.login-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  z-index: 10;
}

.login-card {
  position: relative;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.05));
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -150px;
  left: -150px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 50%;
  right: -100px;
  animation-delay: 2s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: -75px;
  left: 30%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

.q-form {
  .q-field {
    transition: all 0.3s ease;
    
    &:focus-within {
      transform: translateY(-2px);
    }
  }
}

@media (max-width: 480px) {
  .login-container {
    max-width: 90vw;
  }
  
  .login-card {
    margin: 0 16px;
  }
}
</style>