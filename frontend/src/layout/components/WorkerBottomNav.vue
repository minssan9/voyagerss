<template>
  <nav class="worker-tabbar" :aria-label="t('routes.myTasks')">
    <router-link
      :to="{ name: 'TaskListMobile' }"
      class="worker-tabbar__item"
      :class="{ 'worker-tabbar__item--active': route.name === 'TaskListMobile' }"
    >
      <q-icon name="work" size="22px" />
      <span>{{ t('routes.myTasks') }}</span>
    </router-link>
    <router-link
      :to="{ name: 'FuneralBoard' }"
      class="worker-tabbar__item"
      :class="{ 'worker-tabbar__item--active': route.name === 'FuneralBoard' }"
    >
      <q-icon name="event_note" size="22px" />
      <span>{{ t('routes.funeralBoard') }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
</script>
