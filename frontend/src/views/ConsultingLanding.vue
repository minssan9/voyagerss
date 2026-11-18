<template>
  <div class="cl-page">
    <!-- Nav -->
    <header class="cl-nav" :class="{ 'cl-nav--scrolled': scrolled }">
      <div class="cl-nav__inner">
        <a href="#top" class="cl-nav__brand">VoyagerSS<span class="cl-nav__brand-dot">.</span>AI</a>
        <nav class="cl-nav__links">
          <a href="#services">{{ t('consulting.nav.services') }}</a>
          <a href="#process">{{ t('consulting.nav.process') }}</a>
          <a href="#engagement">{{ t('consulting.nav.engagement') }}</a>
          <a href="#faq">{{ t('consulting.nav.faq') }}</a>
        </nav>
        <div class="cl-nav__actions">
          <select
            class="cl-lang"
            :value="locale"
            :aria-label="t('consulting.language')"
            @change="onLocaleChange(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in LOCALE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <a :href="mailtoHref" class="cl-btn cl-btn--primary cl-btn--sm">{{ t('consulting.nav.contact') }}</a>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section id="top" class="cl-hero">
      <p class="cl-eyebrow">{{ t('consulting.hero.eyebrow') }}</p>
      <h1 class="cl-hero__title">{{ t('consulting.hero.title') }}</h1>
      <p class="cl-hero__subtitle">{{ t('consulting.hero.subtitle') }}</p>
      <div class="cl-hero__actions">
        <a :href="mailtoHref" class="cl-btn cl-btn--primary">{{ t('consulting.hero.ctaPrimary') }}</a>
        <a href="#services" class="cl-btn cl-btn--ghost">{{ t('consulting.hero.ctaSecondary') }}</a>
      </div>
      <ul class="cl-stats">
        <li v-for="(stat, i) in stats" :key="i" class="cl-stats__item">
          <span class="cl-stats__value">{{ stat.value }}</span>
          <span class="cl-stats__label">{{ stat.label }}</span>
        </li>
      </ul>
    </section>

    <!-- Services -->
    <section id="services" class="cl-section cl-section--muted">
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title">{{ t('consulting.services.title') }}</h2>
          <p class="cl-section__subtitle">{{ t('consulting.services.subtitle') }}</p>
        </header>
        <div class="cl-grid cl-grid--3">
          <article v-for="(item, i) in services" :key="i" class="cl-card">
            <q-icon :name="item.icon" size="32px" class="cl-card__icon" />
            <h3 class="cl-card__title">{{ item.title }}</h3>
            <p class="cl-card__text">{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Process -->
    <section id="process" class="cl-section">
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title">{{ t('consulting.process.title') }}</h2>
          <p class="cl-section__subtitle">{{ t('consulting.process.subtitle') }}</p>
        </header>
        <ol class="cl-steps">
          <li v-for="(step, i) in steps" :key="i" class="cl-steps__item">
            <span class="cl-steps__num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="cl-steps__title">{{ step.title }}</h3>
            <p class="cl-steps__text">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Engagement -->
    <section id="engagement" class="cl-section cl-section--muted">
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title">{{ t('consulting.engagement.title') }}</h2>
          <p class="cl-section__subtitle">{{ t('consulting.engagement.subtitle') }}</p>
        </header>
        <div class="cl-grid cl-grid--3">
          <article
            v-for="(plan, i) in plans"
            :key="i"
            class="cl-plan"
            :class="{ 'cl-plan--featured': i === FEATURED_PLAN }"
          >
            <span v-if="i === FEATURED_PLAN" class="cl-plan__badge">{{ t('consulting.engagement.recommended') }}</span>
            <h3 class="cl-plan__name">{{ plan.name }}</h3>
            <p class="cl-plan__period">{{ plan.period }}</p>
            <p class="cl-plan__text">{{ plan.text }}</p>
            <ul class="cl-plan__features">
              <li v-for="(f, j) in plan.features" :key="j">
                <q-icon name="check" size="18px" /> {{ f }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="cl-section">
      <div class="cl-container cl-container--narrow">
        <header class="cl-section__header">
          <h2 class="cl-section__title">{{ t('consulting.faq.title') }}</h2>
        </header>
        <details v-for="(item, i) in faqs" :key="i" class="cl-faq">
          <summary class="cl-faq__q">{{ item.q }}</summary>
          <p class="cl-faq__a">{{ item.a }}</p>
        </details>
      </div>
    </section>

    <!-- CTA -->
    <section id="contact" class="cl-cta">
      <h2 class="cl-cta__title">{{ t('consulting.cta.title') }}</h2>
      <p class="cl-cta__subtitle">{{ t('consulting.cta.subtitle') }}</p>
      <a :href="mailtoHref" class="cl-btn cl-btn--light">{{ t('consulting.cta.button') }}</a>
      <p class="cl-cta__email">{{ CONTACT_EMAIL }}</p>
    </section>

    <!-- Footer -->
    <footer class="cl-footer">
      <div class="cl-footer__inner">
        <div>
          <strong>VoyagerSS</strong>
          <span class="cl-footer__tagline">{{ t('consulting.footer.tagline') }}</span>
        </div>
        <nav class="cl-footer__links">
          <router-link to="/platform">{{ t('consulting.footer.platform') }}</router-link>
          <router-link to="/privacy-policy">{{ t('consulting.footer.privacy') }}</router-link>
          <router-link to="/terms">{{ t('consulting.footer.terms') }}</router-link>
        </nav>
        <p class="cl-footer__copy">{{ t('consulting.footer.copyright') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { loadLanaguageAsync } from '@/locales/i18n'

interface Stat { value: string; label: string }
interface Service { icon: string; title: string; text: string }
interface Step { title: string; text: string }
interface Plan { name: string; period: string; text: string; features: string[] }
interface Faq { q: string; a: string }

const CONTACT_EMAIL = 'contact@voyagerss.com'
const FEATURED_PLAN = 1

// 언어명은 각 언어의 자국어 표기로 고정 (현재 언어와 무관)
const LOCALE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
] as const

const { t, tm, rt, locale } = useI18n()

/** tm() 결과(메시지 AST)를 일반 문자열 객체로 변환 */
function resolve<T>(key: string): T[] {
  const toPlain = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(toPlain)
    if (node && typeof node === 'object' && !('type' in (node as object)) && !('b' in (node as object))) {
      return Object.fromEntries(Object.entries(node as object).map(([k, v]) => [k, toPlain(v)]))
    }
    return rt(node as Parameters<typeof rt>[0])
  }
  return toPlain(tm(key)) as T[]
}

const stats = computed(() => resolve<Stat>('consulting.stats'))
const services = computed(() => resolve<Service>('consulting.services.items'))
const steps = computed(() => resolve<Step>('consulting.process.steps'))
const plans = computed(() => resolve<Plan>('consulting.engagement.items'))
const faqs = computed(() => resolve<Faq>('consulting.faq.items'))

const mailtoHref = computed(
  () => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t('consulting.cta.mailSubject'))}`
)

function onLocaleChange(next: string) {
  void loadLanaguageAsync(next, true)
}

const scrolled = ref(false)
const onScroll = () => {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>
