<template>
  <q-page class="column items-center justify-center">
    <div class="text-center">
      <div class="text-h1 text-grey-4 q-mb-md">404</div>
      <div class="text-h4 q-mb-md">{{ t('notFound.title') }}</div>
      <div class="text-subtitle1 text-grey-7 q-mb-xl">
        {{ t('notFound.message') }}
      </div>
      <q-btn
        color="primary"
        :label="t('notFound.button.home')"
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

