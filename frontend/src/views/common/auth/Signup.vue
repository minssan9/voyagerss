<template>
  <div class="column items-center justify-center q-pa-md auth-page">
    <div class="auth-container card q-pa-lg">
      <h5 class="text-center q-mb-md">{{ t('signup.title') }}</h5>
      
      <q-form @submit="handleSignup" class="q-gutter-md">
        <q-input
          v-model="signupForm.email"
          :label="t('signup.email.label')"
          type="email"
          outlined
          class="auth-input"
          :rules="[
            val => !!val || t('signup.validation.required'),
            val => isValidEmail(val) || t('signup.validation.email')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.username"
          :label="t('signup.username.label')"
          outlined
          class="auth-input"
          :rules="[
            val => !!val || t('signup.validation.required'),
            val => val.length >= 2 || t('signup.validation.username.length')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="person" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.password"
          :label="t('signup.password.label')"
          type="password"
          outlined
          class="auth-input"
          :rules="[
            val => !!val || t('signup.validation.required'),
            val => val.length >= 4 || t('signup.validation.password.length')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
        </q-input>

        <q-input
          v-model="signupForm.confirmPassword"
          :label="t('signup.confirmPassword.label')"
          type="password"
          outlined
          class="signup-input"
          :rules="[
            val => !!val || t('signup.validation.required'),
            val => val === signupForm.password || t('signup.validation.password.match')
          ]"
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
        </q-input>

        

        <q-btn
          type="submit"
          color="primary"
          :label="t('signup.button.submit')"
          class="full-width q-py-sm q-mt-lg"
          size="lg"
        />

        <div class="row justify-center q-mt-md">
          <span class="text-grey-7">{{ t('signup.login.prompt') }}</span>
          <q-btn
            flat
            dense
            color="primary"
            class="q-px-sm"
            :label="t('signup.login.link')"
            @click="router.push('/login')"
          />
        </div>
      </q-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import apiAccount from "@/api/account/api-account"

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
      $q.notify({type: 'positive', message: t('signup.success') })
      router.push('/login')
    }
  } catch (error) {
    console.error('Signup error:', error)
    let errorMessage = t('signup.error.default')
    
    if (error.response?.status === 409) {
      errorMessage = t('signup.error.emailExists')
    }
    
    $q.notify({ type: 'negative', message: errorMessage })
  }
}
</script>
