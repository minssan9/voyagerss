<template>
  <q-page class="column items-center justify-center">
    <div class="text-center">
      <div class="text-h1 text-grey-4 q-mb-md">401</div>
      <div class="text-h4 q-mb-md">{{ t('unauthorized.title', '인증이 필요합니다') }}</div>
      <div class="text-subtitle1 text-grey-7 q-mb-xl">
        {{ t('unauthorized.message', '로그인이 필요한 페이지입니다') }}
      </div>
      <div class="row justify-center q-gutter-md">
        <q-btn
          color="primary"
          :label="t('unauthorized.button.login', '로그인')"
          :to="{ path: loginPath, query: loginQuery }"
          class="q-mb-md"
        />
        <q-btn
          outline
          color="primary"
          :label="t('unauthorized.button.home', '홈으로')"
          to="/"
          class="q-mb-md"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const { t } = useI18n()
const route = useRoute()

const loginPath = computed(() => {
  const q = route.query.login
  return typeof q === 'string' && q.length > 0 ? q : '/login'
})

const loginQuery = computed(() => {
  const r = route.query.redirect
  const redirect = typeof r === 'string' && r.length > 0 ? r : '/'
  return { redirect }
})
</script>

<style scoped>
.q-page {
  min-height: calc(100vh - 100px);
}
</style> 

