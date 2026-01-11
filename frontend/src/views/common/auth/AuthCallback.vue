<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card class="q-pa-lg text-center" style="min-width: 300px">
      <q-card-section>
        <q-spinner-orbit
          color="primary"
          size="50px"
          class="q-mb-md"
        />
        <div class="text-h6 q-mb-sm">Processing login...</div>
        <div class="text-caption text-grey-7">Please wait while we log you in</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const error = params.get('error')

    if (error) {
      $q.notify({
        type: 'negative',
        message: `Login failed: ${error}`,
        position: 'top'
      })
      router.push('/login')
      return
    }

    if (accessToken && refreshToken) {
      // 토큰 저장 (localStorage 또는 Pinia store)
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      $q.notify({
        type: 'positive',
        message: 'Login successful!',
        position: 'top'
      })

      // 사용자 정보 가져오기 (선택)
      // await authStore.fetchUser()

      // 워크스케줄 페이지로 리다이렉트
      router.push('/workschd/task/manage')
    } else {
      $q.notify({
        type: 'negative',
        message: 'Login failed: No tokens received',
        position: 'top'
      })
      router.push('/login')
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    $q.notify({
      type: 'negative',
      message: 'Login failed: An error occurred',
      position: 'top'
    })
    router.push('/login')
  }
})
</script>
