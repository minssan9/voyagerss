<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(48,184,138,0.08); color: #30b88a;">
          <q-icon name="flight" size="14px" />
          {{ t('aviation.dashboard.badge') }}
        </span>
        <h1 class="lp-title" style="white-space: pre-line;">{{ t('aviation.dashboard.title') }}</h1>
        <p class="lp-subtitle" style="white-space: pre-line;">
          {{ t('aviation.dashboard.subtitle') }}
        </p>
        <div class="lp-actions">
          <q-btn class="lp-btn-primary" :label="t('aviation.dashboard.topicsManage')" no-caps unelevated @click="router.push('/aviation/topics')" />
          <q-btn class="lp-btn-secondary" :label="t('aviation.dashboard.weatherStatus')" no-caps outline @click="router.push('/aviation/weather')" />
        </div>
      </section>

      <!-- Stats Strip -->
      <div class="lp-stats">
        <div class="lp-stat">
          <q-skeleton v-if="!stats" type="text" width="60px" class="q-mx-auto" />
          <template v-else>
            <div class="lp-stat__icon" style="color: #30b88a;"><q-icon name="menu_book" size="22px" /></div>
            <div class="lp-stat__value">{{ stats.totalTopics ?? 0 }}</div>
            <div class="lp-stat__label">{{ t('aviation.dashboard.totalTopics') }}</div>
          </template>
        </div>
        <div class="lp-stat">
          <q-skeleton v-if="!stats" type="text" width="60px" class="q-mx-auto" />
          <template v-else>
            <div class="lp-stat__icon" style="color: #118ab2;"><q-icon name="check_circle" size="22px" /></div>
            <div class="lp-stat__value">{{ stats.activeTopics ?? 0 }}</div>
            <div class="lp-stat__label">{{ t('aviation.dashboard.activeTopics') }}</div>
          </template>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #6b7280;"><q-icon name="calendar_today" size="22px" /></div>
          <div class="lp-stat__value">{{ weeklySchedule.length }}</div>
          <div class="lp-stat__label">{{ t('aviation.dashboard.weeklySchedule') }}</div>
        </div>
      </div>

      <!-- Weekly Schedule -->
      <div class="lp-card q-mt-sm">
        <div class="lp-card__header">
          <span class="lp-card__title">{{ t('aviation.dashboard.weeklyScheduleTitle') }}</span>
          <q-btn flat dense icon="open_in_new" size="sm" color="grey-5" @click="router.push('/aviation/topics')" />
        </div>
        <div class="lp-schedule">
          <div v-if="weeklySchedule.length === 0" class="lp-empty">
            <q-icon name="event_note" size="2rem" color="grey-4" />
            <span>{{ t('aviation.dashboard.noSchedule') }}</span>
          </div>
          <div
            v-for="item in weeklySchedule"
            :key="item.day_of_month ?? item.dayOfWeek"
            class="lp-schedule__item"
          >
            <span class="lp-schedule__day">{{ dayNames[item.day_of_month ?? item.dayOfWeek] }}</span>
            <span class="lp-schedule__name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="lp-nav-grid">
        <div class="lp-nav-card" @click="router.push('/aviation/topics')">
          <div class="lp-nav-card__icon" style="background: rgba(48,184,138,0.08); color: #30b88a;">
            <q-icon name="menu_book" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aviation.dashboard.navTopicsTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aviation.dashboard.navTopicsDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/aviation/weather')">
          <div class="lp-nav-card__icon" style="background: rgba(17,138,178,0.08); color: #118ab2;">
            <q-icon name="cloud" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aviation.dashboard.navWeatherTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aviation.dashboard.navWeatherDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
        <div class="lp-nav-card" @click="router.push('/aviation/backups')">
          <div class="lp-nav-card__icon" style="background: rgba(107,114,128,0.08); color: #6b7280;">
            <q-icon name="backup" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aviation.dashboard.navBackupsTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aviation.dashboard.navBackupsDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { topicsApi } from '@/modules/aviation/api/client'

const router = useRouter()
const { t, tm } = useI18n()
const $q = useQuasar()

const stats = ref<any>(null)
const weeklySchedule = ref<any[]>([])
const dayNames = computed(() => tm('aviation.common.daysShort') as string[])

async function loadStats() {
  try {
    stats.value = await topicsApi.getStats()
  } catch (error: any) {
    $q.notify({ type: 'negative', message: t('aviation.dashboard.notify.statsLoadFailed', { message: error.message }) })
  }
}

async function loadSchedule() {
  try {
    weeklySchedule.value = await topicsApi.getSchedule()
  } catch (error: any) {
    $q.notify({ type: 'negative', message: t('aviation.dashboard.notify.scheduleLoadFailed', { message: error.message }) })
  }
}

onMounted(() => {
  loadStats()
  loadSchedule()
})
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';
</style>
