<script setup lang="ts">
import { RouterView, useRoute, useRouter } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { applyRouteHead } from '@/utils/head'
import { installComponentClipboard } from '@/devtools/component-clipboard'

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const layout = computed(() => route.meta.layout ?? 'default')

watch(locale, () => applyRouteHead(route))

let removeClipboard: (() => void) | undefined

onMounted(() => {
  removeClipboard = installComponentClipboard(router)
})

onUnmounted(() => {
  removeClipboard?.()
})
</script>

<template>
  <RouterView v-if="layout === 'blank'" />
  <MainLayout v-else>
    <RouterView />
  </MainLayout>
</template>
