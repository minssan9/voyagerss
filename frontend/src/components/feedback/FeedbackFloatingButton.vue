<template>
  <q-page-sticky position="bottom-right" :offset="[18, 18]">
    <q-btn
      fab
      icon="feedback"
      color="primary"
      class="feedback-floating-btn"
      @click="dialogOpen = true"
    >
      <q-tooltip anchor="center left" self="center right">기능 개선 요청</q-tooltip>
    </q-btn>
    <FeedbackRequestDialog v-model="dialogOpen" />
  </q-page-sticky>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FeedbackRequestDialog from './FeedbackRequestDialog.vue'

const dialogOpen = ref(false)
</script>

<style scoped>
.feedback-floating-btn {
  z-index: 2000;
}
</style>
