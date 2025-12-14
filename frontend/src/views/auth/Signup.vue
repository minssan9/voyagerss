<template>
  <q-page class="column items-center justify-center q-pa-md">
    <div class="signup-container q-pa-lg">
      <h5 class="text-center q-mb-md">{{ t('signup.title', '회원가입') }}</h5>
      
      <q-form @submit="handleSignup" class="q-gutter-md">
        <q-input
          v-model="signupForm.email"
          :label="t('signup.email.label', '이메일')"
          type="email"
          outlined
          class="signup-input"
          :rules="[
            val => !!val || t('signup.validation.required', '필수 입력 항목입니다'),
            val => isValidEmail(val) || t('signup.validation.email', '올바른 이메일 형식이 아닙니다')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.username"
          :label="t('signup.username.label', '사용자 이름')"
          outlined
          class="signup-input"
          :rules="[
            val => !!val || t('signup.validation.required', '필수 입력 항목입니다'),
            val => val.length >= 2 || t('signup.validation.username.length', '사용자 이름은 2자 이상이어야 합니다')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="person" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.password"
          :label="t('signup.password.label', '비밀번호')"
          type="password"
          outlined
          class="signup-input"
          :rules="[
            val => !!val || t('signup.validation.required', '필수 입력 항목입니다'),
            val => val.length >= 4 || t('signup.validation.password.length', '비밀번호는 4자 이상이어야 합니다')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.confirmPassword"
          :label="t('signup.confirmPassword.label', '비밀번호 확인')"
          type="password"
          outlined
          class="signup-input"
          :rules="[
            val => !!val || t('signup.validation.required', '필수 입력 항목입니다'),
            val => val === signupForm.password || t('signup.validation.password.match', '비밀번호가 일치하지 않습니다')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
        </q-input>

        

        <q-btn
          type="submit"
          color="primary"
          :label="t('signup.button.submit', '가입하기')"
          class="full-width q-py-sm q-mt-lg"
          size="lg"
        />

        <div class="row justify-center q-mt-md">
          <span class="text-grey-7">{{ t('signup.login.prompt', '이미 계정이 있으신가요?') }}</span>
          <q-btn
            flat
            dense
            color="primary"
            class="q-px-sm"
            :label="t('signup.login.link', '로그인')"
            @click="router.push('/login')"
          />
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import apiAccount from "@/api/modules/api-account"

const { t } = useI18n()
const $q = useQuasar()
const router = useRouter()

const signupForm = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

function isValidEmail(email) {
  const emailPattern = /^(?=[a-zA-Z0-9@._%+-]{6,254}$)[a-zA-Z0-9._%+-]{1,64}@(?:[a-zA-Z0-9-]{1,63}\.){1,8}[a-zA-Z]{2,63}$/
  return emailPattern.test(email)
}

const handleSignup = async () => {
  try {
    const response = await apiAccount.signup({
      email: signupForm.value.email,
      username: signupForm.value.username,
      password: signupForm.value.password
    })

    if (response) {
      $q.notify({type: 'positive', message: t('signup.success', '회원가입이 완료되었습니다. 로그인해주세요.') })
      router.push('/login')
    }
  } catch (error) {
    console.error('Signup error:', error)
    let errorMessage = t('signup.error.default', '회원가입 중 오류가 발생했습니다.')
    
    if (error.response?.status === 409) {
      errorMessage = t('signup.error.emailExists', '이미 존재하는 이메일입니다.')
    }
    
    $q.notify({ type: 'negative', message: errorMessage })
  }
}
</script>

<style lang="scss" scoped>
.signup-container {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.signup-input {
  font-size: 1.1em;

  :deep(.q-field__control) {
    height: 56px;
  }

  :deep(.q-field__marginal) {
    height: 56px;
  }
}

.q-page {
  background-color: #f5f5f5;
  background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
  background-size: 20px 20px;
}
</style> 