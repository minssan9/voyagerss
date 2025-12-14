<template>
  <q-page class="column items-center justify-center">
    <div class="text-center">
      <div class="text-h1 text-grey-4 q-mb-md">403</div>
      <div class="text-h4 q-mb-md">{{ t('forbidden.title', '접근 권한이 없습니다') }}</div>
      <div class="text-subtitle1 text-grey-7 q-mb-xl">
        {{ t('forbidden.message', '해당 페이지에 대한 접근 권한이 없습니다') }}
      </div>
      <q-btn
        color="primary"
        :label="t('forbidden.button.home', '홈으로 돌아가기')"
        to="/"
        class="q-mb-md"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.q-page {
  min-height: calc(100vh - 100px);
}
</style> 