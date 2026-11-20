<template>
  <q-page class="lp-page">
    <div class="lp-container">
      <section class="lp-hero">
        <span class="lp-badge lp-tone--blue">
          <q-icon name="event_note" size="14px" />
          {{ t('home.badge') }}
        </span>
        <h1 class="lp-title">{{ t('home.titleLine1') }}<br>{{ t('home.titleLine2') }}</h1>
        <p class="lp-subtitle">{{ t('home.subtitleLine1') }}<br>{{ t('home.subtitleLine2') }}</p>
        <div class="lp-actions">
          <q-btn class="lp-btn-primary" :label="t('home.cta.taskManage')" no-caps unelevated @click="router.push({ name: 'TaskManage' })" />
          <q-btn class="lp-btn-secondary" :label="t('home.cta.funeralBoard')" no-caps outline @click="router.push({ name: 'FuneralBoard' })" />
        </div>
      </section>
      <div class="lp-stats">
        <div class="lp-stat">
          <div class="lp-stat__icon lp-tone--blue"><q-icon name="schedule" size="22px" /></div>
          <div class="lp-stat__value">{{ t('home.stats.automation.value') }}</div>
          <div class="lp-stat__label">{{ t('home.stats.automation.label') }}</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon lp-tone--blue"><q-icon name="notifications_active" size="22px" /></div>
          <div class="lp-stat__value">{{ t('home.stats.realtime.value') }}</div>
          <div class="lp-stat__label">{{ t('home.stats.realtime.label') }}</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon lp-tone--blue"><q-icon name="groups" size="22px" /></div>
          <div class="lp-stat__value">{{ t('home.stats.teamBased.value') }}</div>
          <div class="lp-stat__label">{{ t('home.stats.teamBased.label') }}</div>
        </div>
      </div>
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-4" v-for="featureKey in ['task', 'team', 'funeral']" :key="featureKey">
          <div class="lp-card full-height">
            <div class="lp-feature-icon" :class="featureTones[featureKey]">
              <q-icon :name="featureIconNames[featureKey]" size="28px" />
            </div>
            <div class="lp-feature-title">{{ t(`home.features.${featureKey}.title`) }}</div>
            <div class="lp-feature-desc">{{ t(`home.features.${featureKey}.desc`) }}</div>
            <div class="lp-feature-list">
              <span v-for="n in 3" :key="n"><q-icon name="check_circle" size="14px" color="positive" /> {{ t(`home.features.${featureKey}.item${n}`) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="lp-nav-grid">
        <div class="lp-nav-card" v-for="nav in navItems" :key="nav.key" @click="router.push(nav.to)">
          <div class="lp-nav-card__icon" :class="nav.tone">
            <q-icon :name="nav.icon" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t(`home.nav.${nav.key}.title`) }}</div>
          <div class="lp-nav-card__desc">{{ t(`home.nav.${nav.key}.desc`) }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const featureTones: Record<string, string> = {
  task: 'lp-tone--blue',
  team: 'lp-tone--green',
  funeral: 'lp-tone--amber'
}
const featureIconNames: Record<string, string> = {
  task: 'assignment', team: 'people', funeral: 'monitor_heart'
}
const navItems = [
  { key: 'task', to: { name: 'TaskManage' }, icon: 'assignment', tone: 'lp-tone--blue' },
  { key: 'team', to: { name: 'TeamManage' }, icon: 'group', tone: 'lp-tone--green' },
  { key: 'funeral', to: { name: 'FuneralBoard' }, icon: 'dashboard', tone: 'lp-tone--amber' }
]
</script>
