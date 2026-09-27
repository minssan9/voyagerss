<template>
  <q-page-sticky position="bottom-right" :offset="[18, 18]">
    <q-btn
      fab
      icon="feedback"
      color="primary"
      class="feedback-floating-btn"
      @click="dialogOpen = true"
    >
      <q-tooltip anchor="center left" self="center right">{{ t('feedback.title') }}</q-tooltip>
    </q-btn>
    <FeedbackRequestDialog v-model="dialogOpen" />
  </q-page-sticky>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FeedbackRequestDialog from './FeedbackRequestDialog.vue'

const { t } = useI18n()
const dialogOpen = ref(false)
</script>

<style scoped>
.feedback-floating-btn {
  z-index: 2000;
}
</style>
