<template>
  <q-page class="workschd-page" :data-testid="testId">
    <div class="workschd-page__inner">
      <header class="workschd-page__header">
        <div class="workschd-page__heading">
          <h1 class="workschd-page__title">{{ title }}</h1>
          <p v-if="subtitle" class="workschd-page__subtitle">{{ subtitle }}</p>
        </div>
        <div class="workschd-page__actions">
          <slot name="actions" />
          <div id="workschd-page-actions" />
        </div>
        <div class="workschd-page__toolbar">
          <slot name="toolbar" />
          <div id="workschd-page-toolbar" />
        </div>
      </header>
      <div class="workschd-page__body" :class="bodyClass">
        <slot />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  testId?: string
  bodyClass?: string
}>()
</script>
