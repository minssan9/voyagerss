<template>
  <div class="column items-center justify-center q-pa-md auth-page window-height">
    <div class="auth-container card q-pa-lg">
      <div class="column items-center q-mb-lg">
        <q-avatar size="64px" color="dark" text-color="white" class="text-weight-bold q-mb-md">
          {{ t('workschdSignup.brandIcon') }}
        </q-avatar>
        <h1 class="text-h5 text-weight-bold q-my-none">{{ t('workschdSignup.title') }}</h1>
        <p class="text-grey-7 q-mt-xs q-mb-none">{{ t('workschdSignup.subtitle') }}</p>
      </div>

      <q-separator class="q-mb-lg" />

      <q-form class="q-gutter-y-sm" @submit="submit">
        <q-input
          v-model="username"
          outlined
          :placeholder="t('workschdSignup.namePlaceholder')"
          autocomplete="name"
          :rules="[val => !!val]"
        />
        <q-input
          v-model="email"
          type="email"
          outlined
          :placeholder="t('workschdSignup.emailPlaceholder')"
          autocomplete="email"
          :rules="[val => !!val]"
        />
        <q-input
          v-model="password"
          type="password"
          outlined
          :placeholder="t('workschdSignup.passwordPlaceholder')"
          autocomplete="new-password"
          :rules="[val => (val?.length ?? 0) >= 8]"
        />
        <q-input
          v-model="passwordConfirm"
          type="password"
          outlined
          :placeholder="t('workschdSignup.passwordConfirmPlaceholder')"
          autocomplete="new-password"
          :rules="[val => !!val]"
        />

        <q-banner v-if="error" dense rounded class="bg-red-1 text-negative text-center">{{ error }}</q-banner>

        <q-btn
          type="submit"
          color="dark"
          unelevated
          no-caps
          class="full-width"
          :loading="loading"
          :label="t('workschdSignup.submit')"
        />
      </q-form>

      <p class="text-caption text-grey-7 text-center q-mt-lg q-mb-none">
        {{ t('workschdSignup.hasAccount') }}
        <router-link to="/login?service=workschd" class="text-primary">{{ t('workschdSignup.login') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const { t } = useI18n();

const username = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const error = ref('');

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function submit() {
  error.value = '';

  if (password.value !== passwordConfirm.value) {
    error.value = t('workschdSignup.errorPasswordMismatch');
    return;
  }

  loading.value = true;
  try {
    await axios.post(`${API_BASE}/workschd/auth/signup`, {
      email: email.value,
      password: password.value,
      username: username.value,
    });
    router.push('/login?service=workschd&registered=1');
  } catch (e: any) {
    if (e.response?.status === 409) {
      error.value = t('workschdSignup.errorEmailTaken');
    } else {
      error.value = e.response?.data?.message || t('workschdSignup.errorFailed');
    }
  } finally {
    loading.value = false;
  }
}
</script>
