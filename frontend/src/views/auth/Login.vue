<template>
  <q-page class="column items-center justify-center q-pa-md">
    <!-- Social Login Container -->
    <div class="login-container q-pa-lg">
      <!-- Kakao Direct Login -->
      <div class="row justify-center q-mb-lg">
        <q-btn
          class="social-login-btn"
          flat
          @click="kakaoLogin()"
        >
          <img
            src="https://k.kakaocdn.net/14/dn/btroDszwNrM/I6efHub1SN5KCJqLm1Ovx1/o.jpg"
            width="300"
            height="45"
            :alt="t('login.kakao.button.alt', '카카오 로그인 버튼')"
          />
        </q-btn>
      </div>

      <!-- Social Login Buttons -->
      <div class="column items-center q-gutter-y-md">
        <!-- Kakao -->
        <q-btn
          class="social-login-btn"
          flat
          :href="getSocialLoginUrl('kakao')"
        >
          <img 
            :src="`${VITE_CDN_URL}/website/button/kakao-signin-korean.png`"
            width="300"
            height="45"
            :alt="t('login.kakao.signin.alt', 'kakaoLogin')"
          />
        </q-btn>

        <!-- Google -->
        <q-btn
          class="social-login-btn"
          flat
          :href="getSocialLoginUrl('google')"
        >
          <img 
            :src="`${VITE_CDN_URL}/website/button/google-signin-korean.png`"
            width="300"
            height="45"
            :alt="t('login.google.signin.alt', 'googleLogin')"
          />
        </q-btn>

        <!-- Naver -->
        <q-btn
          class="social-login-btn"
          flat
          :href="getSocialLoginUrl('naver')"
        >
          <img 
            :src="`${VITE_CDN_URL}/website/button/naver-signin-korean.png`"
            width="300"
            height="45"
            style="border-radius: 8px"
            :alt="t('login.naver.signin.alt', 'naverLogin')"
          />
        </q-btn>
      </div>

      <!-- Divider -->
      <q-separator class="q-my-lg" />

      <!-- Email Login Form -->
      <div class="email-login-form q-pa-md">
        <h5 class="text-center q-mb-md">{{ t('login.title', '로그인') }}</h5>
        <q-form @submit="handleLogin" class="q-gutter-md">
          <q-input
            v-model="loginForm.email"
            :label="t('login.email.label', '이메일')"
            type="email"
            outlined
            class="login-input"
            :rules="[
              val => !!val || t('login.validation.required', '필수 입력 항목입니다'),
              val => isValidEmail(val) || t('login.validation.email', '올바른 이메일 형식이 아닙니다')
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <q-input
            v-model="loginForm.password"
            :label="t('login.password.label', '비밀번호')"
            type="password"
            outlined
            class="login-input"
            :rules="[
              val => !!val || t('login.validation.required', '필수 입력 항목입니다')
            ]"
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
          </q-input>

          <div class="row justify-between q-mt-md">
            <q-checkbox
              v-model="rememberMe"
              :label="t('login.form.rememberMe', '로그인 상태 유지')"
            />
            <q-btn
              flat
              color="primary"
              :label="t('login.form.forgotPassword', '비밀번호 찾기')"
              class="q-px-sm"
            />
          </div>

          <q-btn
            type="submit"
            color="primary"
            :label="t('login.button.submit', '로그인')"
            class="full-width q-py-sm q-mt-lg"
            size="lg"
          />

          <!-- Add signup link -->
          <div class="row justify-center q-mt-md">
            <span class="text-grey-7">{{ t('login.signup.prompt', '계정이 없으신가요?') }}</span>
            <q-btn
              flat
              dense
              color="primary"
              class="q-px-sm"
              :label="t('login.signup.link', '회원가입')"
              @click="router.push('/signup')"
            />
          </div>

          <!-- Add Google Sign In Button -->
          <q-btn
            type="button"
            color="red"
            class="full-width"
            icon="fab fa-google"
            label="Google로 로그인"
            @click="handleGoogleSignIn"
            :loading="isGoogleLoading"
          />
        </q-form>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import apiAccount from "@/api/modules/api-account"
import { removeAllCookies } from '@/utils/cookieUtils'
import { useRouter } from 'vue-router'
import { GoogleAuthAPI } from './GoogleAuth'
import { useUserStore } from '@/stores/modules/store_user'
import Cookies from 'js-cookie'
const { t } = useI18n()
const $q = useQuasar()
const VITE_CDN_URL = import.meta.env.VITE_CDN_URL
const router = useRouter()
const userStore = useUserStore()

const isGoogleLoading = ref(false)
const googleAuth = new GoogleAuthAPI()

// const kakaoLogin = () => {
//   window.Kakao.Auth.login({
//     scope: "profile_image, account_email",
//     success: getKakaoAccount,
//   })
// }
//
// const getKakaoAccount = () => {
//   window.Kakao.API.request({
//     url: "/v2/user/me",
//     success: (res) => {
//       const kakao_account = res.kakao_account
//       const ninkname = kakao_account.profile.ninkname
//       const email = kakao_account.email
//       console.log("ninkname", ninkname)
//       console.log("email", email)
//
//       //로그인처리구현
//
//       alert("로그인 성공!")
//     },
//     fail: (error) => {
//       console.log(error)
//     },
//   })
// }
//
// const kakaoLogout = () => {
//   window.Kakao.Auth.logout((res) => {
//     console.log(res)
//   })
// }

const getSocialLoginUrl = (socialType) => {
  removeAllCookies()
  return apiAccount.getSocialLoginUrl(socialType, redirect.value)
}

const redirect = ref(null) // Add this if you need the redirect property


// Add login form state
const loginForm = ref({
  email: '',
  password: ''
})
const rememberMe = ref(false)

function isValidEmail(email) {
  const emailPattern = /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(email)
}

// Update login handler
const handleLogin = async () => {
  try {
    const response = await apiAccount.login({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (response) {
      const token = response.data 

      $q.notify({ type: 'positive', message: t('login.success', '로그인되었습니다.') })
      // Redirect to home or dashboard
      router.push('/redirect?token=' + token)
    }
  } catch (error) {
    console.error('Login error:', error)
    let errorMessage = t('login.error.default', '로그인 중 오류가 발생했습니다.')
    
    if (error.response?.status === 401) {
      errorMessage = t('login.error.invalid', '이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    
    $q.notify({ type: 'negative', message: errorMessage })
  }
}

const handleGoogleSignIn = async () => {
  isGoogleLoading.value = true
  try {
    const user = await googleAuth.signIn()
    
    // Get the ID token
    const idToken = await user.getIdToken()
    
    // Update user store with Firebase user info
    userStore.setUser({
      id: user.uid,
      email: user.email || '',
      name: user.displayName || '',
      photo: user.photoURL || '',
      token: idToken
    })

    $q.notify({type: 'positive',message: t('auth.login.success', '로그인 성공')})

    // Redirect to home or intended page
    router.push({ name: 'home' })
  } catch (error: any) {
    console.error('Google sign in error:', error)
    $q.notify({ type: 'negative', message: t('auth.login.error', '로그인 실패') })
  } finally {
    isGoogleLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.social-login-btn {
  width: 300px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.email-login-form {
  .login-input {
    font-size: 1.1em;
  }

  :deep(.q-field__control) {
    height: 56px;
  }

  :deep(.q-field__marginal) {
    height: 56px;
  }
}

// Optional: Add a subtle background pattern
.q-page {
  background-color: #f5f5f5;
  background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
  background-size: 20px 20px;
}

.q-card {
  width: 360px;
  
  @media (max-width: 600px) {
    width: 100%;
  }
}
</style>