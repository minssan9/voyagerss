<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card class="q-pa-lg text-center" style="min-width: 300px">
      <q-card-section>
        <div v-if="hasError">
          <q-icon name="error_outline" color="negative" size="50px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">{{ t('callback.failed') }}</div>
          <div class="text-caption text-grey-7 q-mb-md">{{ t('callback.retry') }}</div>
          <q-btn color="primary" :label="t('callback.backToLogin')" @click="goLogin" />
        </div>
        <div v-else>
          <q-spinner-orbit color="primary" size="50px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">{{ t('callback.processing') }}</div>
          <div class="text-caption text-grey-7">{{ t('callback.wait') }}</div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/common/store_user'

const { t } = useI18n()
const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()
const hasError = ref(false)

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const error = params.get('error')

    if (error || !accessToken) {
      $q.notify({
        type: 'negative',
        message: error ? t('callback.errorWithReason', { error }) : t('callback.errorNoToken'),
        position: 'top'
      })
      hasError.value = true
      return
    }

    userStore.setAccessToken(accessToken)
    if (refreshToken) userStore.setRefreshToken(refreshToken)
    await userStore.login(accessToken)
    await userStore.fetchUser()

    $q.notify({ type: 'positive', message: t('callback.success'), position: 'top' })
    router.replace('/')
  } catch (err) {
    console.error('Auth callback error:', err)
    $q.notify({ type: 'negative', message: t('callback.processError'), position: 'top' })
    hasError.value = true
  }
})

function goLogin() {
  router.replace('/login')
}
</script>
