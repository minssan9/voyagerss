<template>
  <q-page class="lp-page">
    <div class="lp-container">

      <!-- Hero -->
      <section class="lp-hero">
        <span class="lp-badge" style="background: rgba(0,113,227,0.08); color: #0071e3;">
          <q-icon name="auto_awesome" size="14px" />
          {{ t('aipr.home.badge') }}
        </span>
        <h1 class="lp-title" style="white-space: pre-line;">{{ t('aipr.home.title') }}</h1>
        <p class="lp-subtitle" style="white-space: pre-line;">
          {{ t('aipr.home.subtitle') }}
        </p>
        <div class="lp-actions">
          <q-btn
            class="lp-btn-primary"
            :label="t('aipr.home.ctaIssues')"
            no-caps unelevated
            :to="{ name: 'aipr-issues' }"
          />
          <q-btn
            class="lp-btn-secondary"
            :label="t('aipr.home.ctaWidget')"
            no-caps outline
            :to="{ name: 'aipr-widget' }"
          />
        </div>
      </section>

      <!-- Stats Strip -->
      <div class="lp-stats">
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="psychology" size="22px" /></div>
          <div class="lp-stat__value">{{ t('aipr.home.statPlanning') }}</div>
          <div class="lp-stat__label">{{ t('aipr.home.statPlanningDesc') }}</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="merge_type" size="22px" /></div>
          <div class="lp-stat__value">{{ t('aipr.home.statBuildPr') }}</div>
          <div class="lp-stat__label">{{ t('aipr.home.statBuildPrDesc') }}</div>
        </div>
        <div class="lp-stat">
          <div class="lp-stat__icon" style="color: #0071e3;"><q-icon name="insights" size="22px" /></div>
          <div class="lp-stat__value">{{ t('aipr.home.statTracking') }}</div>
          <div class="lp-stat__label">{{ t('aipr.home.statTrackingDesc') }}</div>
        </div>
      </div>

      <!-- Feature Cards -->
      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
              <q-icon name="psychology" size="28px" />
            </div>
            <div class="lp-feature-title">{{ t('aipr.home.featurePlanningTitle') }}</div>
            <div class="lp-feature-desc">{{ t('aipr.home.featurePlanningDesc') }}</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featurePlanning1') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featurePlanning2') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featurePlanning3') }}</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="build" size="28px" />
            </div>
            <div class="lp-feature-title">{{ t('aipr.home.featureBuildTitle') }}</div>
            <div class="lp-feature-desc">{{ t('aipr.home.featureBuildDesc') }}</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureBuild1') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureBuild2') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureBuild3') }}</span>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-4">
          <div class="lp-card" style="height: 100%;">
            <div class="lp-feature-icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
              <q-icon name="feedback" size="28px" />
            </div>
            <div class="lp-feature-title">{{ t('aipr.home.featureWidgetTitle') }}</div>
            <div class="lp-feature-desc">{{ t('aipr.home.featureWidgetDesc') }}</div>
            <div class="lp-feature-list">
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureWidget1') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureWidget2') }}</span>
              <span><q-icon name="check_circle" size="14px" color="positive" /> {{ t('aipr.home.featureWidget3') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Consulting Scope -->
      <section class="lp-section-header q-mt-xl">
        <h2 class="lp-section-title">{{ t('aipr.home.consultingTitle') }}</h2>
        <p class="lp-section-desc">{{ t('aipr.home.consultingDesc') }}</p>
      </section>

      <div class="row q-col-gutter-md q-mt-sm">
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
              <q-icon name="monitoring" size="24px" />
            </div>
            <div class="lp-scope-item__title">{{ t('aipr.home.scopeMonitoring') }}</div>
            <div class="lp-scope-item__desc">{{ t('aipr.home.scopeMonitoringDesc') }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
              <q-icon name="build" size="24px" />
            </div>
            <div class="lp-scope-item__title">{{ t('aipr.home.scopeBuild') }}</div>
            <div class="lp-scope-item__desc">{{ t('aipr.home.scopeBuildDesc') }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
              <q-icon name="fact_check" size="24px" />
            </div>
            <div class="lp-scope-item__title">{{ t('aipr.home.scopeTest') }}</div>
            <div class="lp-scope-item__desc">{{ t('aipr.home.scopeTestDesc') }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(234,67,53,0.08); color: #ea4335;">
              <q-icon name="rocket_launch" size="24px" />
            </div>
            <div class="lp-scope-item__title">{{ t('aipr.home.scopeDeploy') }}</div>
            <div class="lp-scope-item__desc">{{ t('aipr.home.scopeDeployDesc') }}</div>
          </div>
        </div>
        <div class="col-6 col-md">
          <div class="lp-scope-item">
            <div class="lp-scope-item__icon" style="background: rgba(103,65,217,0.08); color: #6741d9;">
              <q-icon name="settings_suggest" size="24px" />
            </div>
            <div class="lp-scope-item__title">{{ t('aipr.home.scopeConfig') }}</div>
            <div class="lp-scope-item__desc">{{ t('aipr.home.scopeConfigDesc') }}</div>
          </div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="lp-nav-grid">
        <router-link :to="{ name: 'aipr-issues' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(0,113,227,0.08); color: #0071e3;">
            <q-icon name="list" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aipr.home.navIssuesTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aipr.home.navIssuesDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
        <router-link :to="{ name: 'aipr-repos' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(52,168,83,0.08); color: #34a853;">
            <q-icon name="folder_open" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aipr.home.navReposTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aipr.home.navReposDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
        <router-link :to="{ name: 'aipr-settings' }" class="lp-nav-card">
          <div class="lp-nav-card__icon" style="background: rgba(251,188,5,0.08); color: #f5a623;">
            <q-icon name="settings" size="24px" />
          </div>
          <div class="lp-nav-card__title">{{ t('aipr.home.navSettingsTitle') }}</div>
          <div class="lp-nav-card__desc">{{ t('aipr.home.navSettingsDesc') }}</div>
          <q-icon name="arrow_forward_ios" size="14px" class="lp-nav-card__arrow" />
        </router-link>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped lang="scss">
@import '@/assets/styles/landing-shared';

.lp-nav-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.lp-section-header {
  text-align: center;
}

.lp-section-title {
  font-size: 26px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.lp-section-desc {
  font-size: 14px;
  color: #6e6e73;
  line-height: 1.6;
}

.lp-scope-item {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.06);
  padding: 16px;
  height: 100%;
  text-align: center;
}

.lp-scope-item__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.lp-scope-item__title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
}

.lp-scope-item__desc {
  font-size: 12px;
  color: #6e6e73;
  line-height: 1.5;
}
</style>
