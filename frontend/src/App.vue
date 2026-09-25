<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import { computed } from 'vue'

const route = useRoute()
const layout = computed(() => route.meta.layout ?? 'default')
</script>

<template>
  <RouterView v-if="layout === 'blank'" />
  <MainLayout v-else>
    <RouterView />
  </MainLayout>
</template>
