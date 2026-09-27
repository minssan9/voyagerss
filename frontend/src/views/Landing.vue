<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="landing-hero">
      <div class="landing-hero__content">
        <h1 class="landing-hero__title">{{ t('landing.hero.title') }}</h1>
        <p class="landing-hero__subtitle">{{ t('landing.hero.subtitle') }}</p>
        <p class="landing-hero__description">
          {{ heroDescriptionLines[0] }}<br />
          {{ heroDescriptionLines[1] }}
        </p>
        <div class="landing-hero__actions">
          <router-link :to="primaryCtaPath" class="landing-btn landing-btn--primary">
            {{ t('landing.hero.ctaPrimary') }}
          </router-link>
          <a href="#features" class="landing-btn landing-btn--secondary">
            {{ t('landing.hero.ctaSecondary') }}
          </a>
        </div>
      </div>
      <div class="landing-hero__scroll-indicator">
        <q-icon name="keyboard_arrow_down" size="32px" color="white" />
      </div>
    </section>

    <!-- Data Excellence Section -->
    <section id="features" class="landing-section landing-section--gray">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">{{ t('landing.stats.title') }}</h2>
          <p class="landing-section__subtitle">
            {{ t('landing.stats.subtitle') }}
          </p>
        </div>

        <div class="landing-stats fade-up">
          <div class="landing-stats__item">
            <div class="landing-stats__value">{{ t('landing.stats.modules.value') }}</div>
            <div class="landing-stats__label">{{ t('landing.stats.modules.label') }}</div>
            <div class="landing-stats__description">{{ t('landing.stats.modules.description') }}</div>
          </div>
          <div class="landing-stats__item">
            <div class="landing-stats__value">{{ t('landing.stats.realtime.value') }}</div>
            <div class="landing-stats__label">{{ t('landing.stats.realtime.label') }}</div>
            <div class="landing-stats__description">{{ t('landing.stats.realtime.description') }}</div>
          </div>
          <div class="landing-stats__item">
            <div class="landing-stats__value">{{ t('landing.stats.access.value') }}</div>
            <div class="landing-stats__label">{{ t('landing.stats.access.label') }}</div>
            <div class="landing-stats__description">{{ t('landing.stats.access.description') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Products Section -->
    <section class="landing-section landing-section--dark">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">{{ t('landing.products.title') }}</h2>
          <p class="landing-section__subtitle">
            {{ t('landing.products.subtitle') }}
          </p>
        </div>

        <div class="landing-products fade-up">
          <router-link
            v-for="mod in visibleModules"
            :key="mod.code"
            :to="mod.path"
            :class="['landing-products__card', mod.cardClass]"
          >
            <div class="landing-products__content">
              <q-icon :name="mod.icon" class="landing-products__icon" />
              <h3 class="landing-products__title">{{ mod.title }}</h3>
              <p class="landing-products__description">
                {{ mod.description }}
              </p>
              <span class="landing-products__link">
                {{ t('landing.products.startLink') }} <q-icon name="arrow_forward" size="18px" />
              </span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="landing-section landing-section--light">
      <div class="landing-section__container">
        <div class="landing-section__header fade-up">
          <h2 class="landing-section__title">{{ t('landing.why.title') }}</h2>
          <p class="landing-section__subtitle">
            {{ t('landing.why.subtitle') }}
          </p>
        </div>

        <div class="landing-features fade-up" style="background: transparent;">
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="verified" class="landing-features__icon" color="primary" />
            <h4 class="landing-features__title">{{ t('landing.why.verified.title') }}</h4>
            <p class="landing-features__text">
              {{ t('landing.why.verified.text') }}
            </p>
          </div>
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="update" class="landing-features__icon" color="accent" />
            <h4 class="landing-features__title">{{ t('landing.why.realtime.title') }}</h4>
            <p class="landing-features__text">
              {{ t('landing.why.realtime.text') }}
            </p>
          </div>
          <div class="landing-features__item" style="background: #f5f5f7;">
            <q-icon name="support_agent" class="landing-features__icon" color="positive" />
            <h4 class="landing-features__title">{{ t('landing.why.support.title') }}</h4>
            <p class="landing-features__text">
              {{ t('landing.why.support.text') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="landing-footer__container">
        <div class="landing-footer__grid">
          <div class="landing-footer__brand">
            <h3>{{ t('landing.hero.title') }}</h3>
            <p>
              {{ t('landing.footer.description') }}
            </p>
          </div>

          <div class="landing-footer__column">
            <h4>{{ t('landing.footer.services') }}</h4>
            <ul>
              <li v-for="mod in visibleModules" :key="mod.code">
                <router-link :to="mod.path">{{ mod.title }}</router-link>
              </li>
            </ul>
          </div>

          <div class="landing-footer__column">
            <h4>{{ t('landing.footer.resources') }}</h4>
            <ul>
              <li><a href="#">{{ t('landing.footer.docs') }}</a></li>
              <li><a href="#">{{ t('landing.footer.apiReference') }}</a></li>
              <li><a href="#">{{ t('landing.footer.blog') }}</a></li>
            </ul>
          </div>

          <div class="landing-footer__column">
            <h4>{{ t('landing.footer.company') }}</h4>
            <ul>
              <li><a href="#">{{ t('landing.footer.about') }}</a></li>
              <li><a href="#">{{ t('landing.footer.contact') }}</a></li>
              <li><a href="#">{{ t('landing.footer.privacy') }}</a></li>
            </ul>
          </div>
        </div>

        <div class="landing-footer__bottom">
          <p>{{ t('landing.footer.copyright') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/common/store_user'
import { MODULE_LANDING_PATHS } from '@/router/route-access'

interface LandingModule {
  code: string
  title: string
  description: string
  icon: string
  path: string
  cardClass: string
}

const { t } = useI18n()

const MODULE_CONFIG = [
  {
    code: 'workschd',
    icon: 'schedule',
    path: MODULE_LANDING_PATHS.workschd,
    cardClass: 'landing-products__card--workschd'
  },
  {
    code: 'aviation',
    icon: 'flight',
    path: MODULE_LANDING_PATHS.aviation,
    cardClass: 'landing-products__card--aviation'
  },
  {
    code: 'aipr',
    icon: 'settings_suggest',
    path: MODULE_LANDING_PATHS.aipr,
    cardClass: 'landing-products__card--aviation'
  },
  {
    code: 'vision',
    icon: 'visibility',
    path: MODULE_LANDING_PATHS.vision,
    cardClass: 'landing-products__card--workschd'
  }
] as const

const userStore = useUserStore()

const heroDescriptionLines = computed(() => t('landing.hero.description').split('\n'))

const allModules = computed<LandingModule[]>(() =>
  MODULE_CONFIG.map((mod) => ({
    ...mod,
    title: t(`landing.products.modules.${mod.code}.title`),
    description: t(`landing.products.modules.${mod.code}.description`)
  }))
)

const visibleModules = computed(() => {
  if (import.meta.env.DEV) return allModules.value
  const profile = userStore.rbacProfile
  if (!profile) return allModules.value
  if (profile.isAdmin) return allModules.value
  return allModules.value.filter((mod) => profile.modules.includes(mod.code))
})

const primaryCtaPath = computed(() => visibleModules.value[0]?.path ?? '/workschd')

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    },
    { threshold: 0.1 }
  )

  document.querySelectorAll('.fade-up').forEach((el) => {
    observer?.observe(el)
  })
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
