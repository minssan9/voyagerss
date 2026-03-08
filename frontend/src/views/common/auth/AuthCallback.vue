<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card class="q-pa-lg text-center" style="min-width: 300px">
      <q-card-section>
        <div v-if="hasError">
          <q-icon name="error_outline" color="negative" size="50px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">로그인에 실패했습니다</div>
          <div class="text-caption text-grey-7 q-mb-md">다시 시도해 주세요.</div>
          <q-btn color="primary" label="로그인으로 돌아가기" @click="goLogin" />
        </div>
        <div v-else>
          <q-spinner-orbit color="primary" size="50px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">로그인 처리 중...</div>
          <div class="text-caption text-grey-7">잠시만 기다려 주세요</div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/common/store_user'

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
      $q.notify({ type: 'negative', message: `로그인 실패: ${error || '토큰 없음'}`, position: 'top' })
      hasError.value = true
      return
    }

    // Store tokens in Pinia store + cookie (via login action)
    userStore.setAccessToken(accessToken)
    if (refreshToken) userStore.setRefreshToken(refreshToken)
    await userStore.login(accessToken)
    await userStore.fetchUser()

    $q.notify({ type: 'positive', message: '로그인 되었습니다!', position: 'top' })
    router.replace('/workschd/funeral-board')
  } catch (err) {
    console.error('Auth callback error:', err)
    $q.notify({ type: 'negative', message: '로그인 처리 중 오류가 발생했습니다', position: 'top' })
    hasError.value = true
  }
})

function goLogin() {
  router.replace('/workschd/login')
}
</script>
