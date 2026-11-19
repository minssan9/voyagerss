<template>
  <div ref="pageRef" class="cl-page">
    <ConsultingHeader :active-id="SECTION_IDS[activeIndex]" :scrolled="activeIndex > 0" />

    <!-- 섹션 인디케이터 -->
    <nav class="cl-dots" aria-label="sections">
      <button
        v-for="(id, i) in SECTION_IDS"
        :key="id"
        type="button"
        class="cl-dots__dot"
        :class="{ 'is-active': i === activeIndex }"
        :aria-label="id"
        @click="goTo(id)"
      />
    </nav>

    <!-- 1. Hero : 3D 뉴럴 글로브 -->
    <section id="top" class="cl-snap cl-hero" data-section>
      <NeuralGlobe class="cl-hero__globe" />
      <div class="cl-hero__content">
        <p class="cl-eyebrow cl-reveal" style="--i: 0">{{ t('consulting.hero.eyebrow') }}</p>
        <h1 class="cl-hero__title cl-reveal" style="--i: 1">{{ t('consulting.hero.title') }}</h1>
        <p class="cl-hero__subtitle cl-reveal" style="--i: 2">{{ t('consulting.hero.subtitle') }}</p>
        <div class="cl-hero__actions cl-reveal" style="--i: 3">
          <a v-if="mailtoHref" :href="mailtoHref" class="cl-btn cl-btn--primary">{{ t('consulting.hero.ctaPrimary') }}</a>
          <a href="#services" class="cl-btn cl-btn--ghost" @click.prevent="goTo('services')">{{ t('consulting.hero.ctaSecondary') }} →</a>
        </div>
        <ul class="cl-stats">
          <li v-for="(stat, i) in stats" :key="i" class="cl-stats__item cl-reveal" :style="{ '--i': 4 + i }">
            <span class="cl-stats__value">{{ stat.value }}</span>
            <span class="cl-stats__label">{{ stat.label }}</span>
          </li>
        </ul>
      </div>
      <button type="button" class="cl-scroll-hint" aria-label="next" @click="goTo('services')"><span /></button>
    </section>

    <!-- 2. Services : 3D 틸트 카드 -->
    <section id="services" class="cl-snap cl-section" data-section>
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title cl-reveal" style="--i: 0">{{ t('consulting.services.title') }}</h2>
          <p class="cl-section__subtitle cl-reveal" style="--i: 1">{{ t('consulting.services.subtitle') }}</p>
        </header>
        <div class="cl-grid cl-grid--3 cl-tilt-stage">
          <div v-for="(item, i) in services" :key="i" class="cl-reveal cl-reveal--3d" :style="{ '--i': 2 + i }">
            <article class="cl-card cl-tilt" @pointermove="onTilt" @pointerleave="onTiltLeave">
              <span class="cl-card__glare" />
              <span class="cl-card__icon-wrap"><q-icon :name="item.icon" size="28px" class="cl-card__icon" /></span>
              <h3 class="cl-card__title">{{ item.title }}</h3>
              <p class="cl-card__text">{{ item.text }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Process : 2D 타임라인 드로잉 + 펄스 -->
    <section id="process" class="cl-snap cl-section cl-section--alt" data-section>
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title cl-reveal" style="--i: 0">{{ t('consulting.process.title') }}</h2>
          <p class="cl-section__subtitle cl-reveal" style="--i: 1">{{ t('consulting.process.subtitle') }}</p>
        </header>
        <div class="cl-timeline">
          <div class="cl-timeline__track"><span class="cl-timeline__fill" /><span class="cl-timeline__pulse" /></div>
          <ol class="cl-steps">
            <li v-for="(step, i) in steps" :key="i" class="cl-steps__item cl-reveal" :style="{ '--i': 2 + i * 2 }">
              <span class="cl-steps__node"><span>{{ String(i + 1).padStart(2, '0') }}</span></span>
              <h3 class="cl-steps__title">{{ step.title }}</h3>
              <p class="cl-steps__text">{{ step.text }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- 4. Engagement : 3D 캐러셀 배치 -->
    <section id="engagement" class="cl-snap cl-section" data-section>
      <div class="cl-container">
        <header class="cl-section__header">
          <h2 class="cl-section__title cl-reveal" style="--i: 0">{{ t('consulting.engagement.title') }}</h2>
          <p class="cl-section__subtitle cl-reveal" style="--i: 1">{{ t('consulting.engagement.subtitle') }}</p>
          <div class="cl-rate cl-reveal" style="--i: 2">
            <span class="cl-rate__label">{{ t('consulting.engagement.rateLabel') }}</span>
            <span class="cl-rate__price">{{ hourlyRate }}<small> / {{ t('consulting.engagement.rateUnit') }}</small></span>
          </div>
          <p class="cl-rate__note cl-reveal" style="--i: 3">{{ t('consulting.engagement.rateNote') }}</p>
        </header>
        <div class="cl-plans">
          <article
            v-for="(plan, i) in plans"
            :key="i"
            class="cl-plan"
            :class="[`cl-plan--pos${i}`, { 'cl-plan--featured': i === FEATURED_PLAN }]"
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

    <!-- 5. Subscribe : 3D 멤버십 카드 -->
    <section id="subscribe" class="cl-snap cl-section cl-sub" data-section>
      <div class="cl-container cl-sub__grid">
        <div class="cl-sub__copy">
          <p class="cl-eyebrow cl-reveal" style="--i: 0">{{ t('consulting.subscribe.eyebrow') }}</p>
          <h2 class="cl-section__title cl-sub__title cl-reveal" style="--i: 1">{{ t('consulting.subscribe.title') }}</h2>
          <p class="cl-section__subtitle cl-reveal" style="--i: 2">{{ t('consulting.subscribe.subtitle') }}</p>
          <ul class="cl-sub__features">
            <li v-for="(f, i) in subFeatures" :key="i" class="cl-reveal cl-reveal--left" :style="{ '--i': 3 + i }">
              <q-icon name="check_circle" size="20px" /> {{ f }}
            </li>
          </ul>
        </div>

        <div class="cl-sub__stage cl-reveal cl-reveal--3d" style="--i: 2">
          <article class="cl-member cl-tilt" @pointermove="onTilt" @pointerleave="onTiltLeave">
            <span class="cl-member__shine" />
            <div class="cl-member__top">
              <span class="cl-member__brand">VoyagerSS<span class="cl-nav__brand-dot">.</span>AI</span>
              <span class="cl-member__chip" />
            </div>
            <p class="cl-member__plan">{{ t('consulting.subscribe.planName') }}</p>
            <p class="cl-member__price">
              <span class="cl-member__amount">{{ subPrice }}</span>
              <span class="cl-member__period">/ {{ t('consulting.subscribe.period') }}</span>
            </p>
            <p class="cl-member__note">{{ t('consulting.subscribe.priceNote', { monthly: subMonthly }) }}</p>
            <a v-if="subscribeHref" :href="subscribeHref" class="cl-btn cl-btn--light cl-member__cta">{{ t('consulting.subscribe.button') }}</a>
          </article>
        </div>
      </div>
    </section>

    <!-- 6. FAQ : 2D 플로팅 오브 -->
    <section id="faq" class="cl-snap cl-section cl-section--alt cl-faq-section" data-section>
      <span class="cl-orb cl-orb--a" aria-hidden="true" />
      <span class="cl-orb cl-orb--b" aria-hidden="true" />
      <div class="cl-container cl-container--narrow">
        <header class="cl-section__header">
          <h2 class="cl-section__title cl-reveal" style="--i: 0">{{ t('consulting.faq.title') }}</h2>
        </header>
        <details v-for="(item, i) in faqs" :key="i" class="cl-faq cl-reveal cl-reveal--left" :style="{ '--i': 1 + i }">
          <summary class="cl-faq__q">{{ item.q }}</summary>
          <p class="cl-faq__a">{{ item.a }}</p>
        </details>
      </div>
    </section>

    <!-- 7. CTA + Footer : 3D 자이로 링 -->
    <section id="contact" class="cl-snap cl-cta" data-section>
      <div class="cl-gyro" aria-hidden="true">
        <span class="cl-gyro__ring cl-gyro__ring--1" />
        <span class="cl-gyro__ring cl-gyro__ring--2" />
        <span class="cl-gyro__ring cl-gyro__ring--3" />
        <span class="cl-gyro__core" />
      </div>
      <div class="cl-cta__body">
        <h2 class="cl-cta__title cl-reveal" style="--i: 0">{{ t('consulting.cta.title') }}</h2>
        <p class="cl-cta__subtitle cl-reveal" style="--i: 1">{{ t('consulting.cta.subtitle') }}</p>
        <template v-if="mailtoHref">
          <a :href="mailtoHref" class="cl-btn cl-btn--light cl-reveal" style="--i: 2">{{ t('consulting.cta.button') }}</a>
          <p class="cl-cta__email cl-reveal" style="--i: 3">{{ contactEmail }}</p>
        </template>
      </div>
      <ConsultingFooter />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAppConfigStore } from '@/stores/common/store_app_config'
import { resolveMessages } from '@/utils/i18n-resolve'
import NeuralGlobe from '@/components/landing/NeuralGlobe.vue'
import ConsultingHeader from '@/components/landing/ConsultingHeader.vue'
import ConsultingFooter from '@/components/landing/ConsultingFooter.vue'
import { useSectionWheel } from '@/composables/useSectionWheel'

interface Stat { value: string; label: string }
interface Service { icon: string; title: string; text: string }
interface Step { title: string; text: string }
interface Plan { name: string; period: string; text: string; features: string[] }
interface Faq { q: string; a: string }

// DB(workschd.system_config, category='frontend')에서 관리 — 비어 있으면 이메일 CTA 숨김
const CONTACT_EMAIL_KEY = 'CONSULTING_CONTACT_EMAIL'
// 연간 구독 가격(USD) — DB 값이 없거나 잘못되면 기본값 사용
const SUB_PRICE_KEY = 'CONSULTING_SUBSCRIPTION_PRICE_USD'
const DEFAULT_SUB_PRICE_USD = 20
// 컨설팅 시간당 요금(USD)
const HOURLY_RATE_KEY = 'CONSULTING_HOURLY_RATE_USD'
const DEFAULT_HOURLY_RATE_USD = 40
const FEATURED_PLAN = 1
const SECTION_IDS = ['top', 'services', 'process', 'engagement', 'subscribe', 'faq', 'contact'] as const
const SNAP_ROOT_CLASS = 'cl-snap-root'

const { t, tm, rt, locale } = useI18n()

const route = useRoute()
const resolve = <T>(key: string) => resolveMessages<T[]>(tm, rt, key)

const stats = computed(() => resolve<Stat>('consulting.stats'))
const services = computed(() => resolve<Service>('consulting.services.items'))
const steps = computed(() => resolve<Step>('consulting.process.steps'))
const plans = computed(() => resolve<Plan>('consulting.engagement.items'))
const faqs = computed(() => resolve<Faq>('consulting.faq.items'))

const appConfig = useAppConfigStore()
const contactEmail = computed(() => appConfig.get(CONTACT_EMAIL_KEY).trim())
const mailtoHref = computed(() =>
  contactEmail.value
    ? `mailto:${contactEmail.value}?subject=${encodeURIComponent(t('consulting.cta.mailSubject'))}`
    : ''
)

const priceOf = (key: string, fallback: number) => {
  const v = Number(appConfig.get(key, String(fallback)))
  return Number.isFinite(v) && v > 0 ? v : fallback
}
const hourlyRateUsd = computed(() => priceOf(HOURLY_RATE_KEY, DEFAULT_HOURLY_RATE_USD))

const subFeatures = computed(() => resolve<string>('consulting.subscribe.features'))
const subPriceUsd = computed(() => priceOf(SUB_PRICE_KEY, DEFAULT_SUB_PRICE_USD))
const formatUsd = (v: number, digits = 0) =>
  new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
const subPrice = computed(() => formatUsd(subPriceUsd.value, Number.isInteger(subPriceUsd.value) ? 0 : 2))
const hourlyRate = computed(() => formatUsd(hourlyRateUsd.value, Number.isInteger(hourlyRateUsd.value) ? 0 : 2))
const subMonthly = computed(() => formatUsd(subPriceUsd.value / 12, 2))
const subscribeHref = computed(() =>
  contactEmail.value
    ? `mailto:${contactEmail.value}?subject=${encodeURIComponent(`${t('consulting.subscribe.mailSubject')} (${subPrice.value} / ${t('consulting.subscribe.period')})`)}`
    : ''
)

// ─── 섹션 스냅 / 활성화 ─────────────────────────────
const pageRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
useSectionWheel(pageRef, '[data-section]')

let revealObserver: IntersectionObserver | null = null
let activeObserver: IntersectionObserver | null = null

function goTo(id: string, behavior: ScrollBehavior = 'smooth') {
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' })
}

// ─── 3D 틸트 카드 ───────────────────────────────────
function onTilt(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  const px = (e.clientX - r.left) / r.width
  const py = (e.clientY - r.top) / r.height
  el.style.setProperty('--rx', `${(0.5 - py) * 14}deg`)
  el.style.setProperty('--ry', `${(px - 0.5) * 14}deg`)
  el.style.setProperty('--gx', `${px * 100}%`)
  el.style.setProperty('--gy', `${py * 100}%`)
}

function onTiltLeave(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

onMounted(() => {
  document.documentElement.classList.add(SNAP_ROOT_CLASS)

  const sections = pageRef.value?.querySelectorAll<HTMLElement>('[data-section]') ?? []

  // 모션 재생: 섹션 상단이 화면 75% 지점에 들어오면 시작, 화면을 완전히 벗어나면 리셋
  revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-active', e.isIntersecting)),
    { rootMargin: '0px 0px -25% 0px', threshold: 0 }
  )
  // 현재 섹션(인디케이터): 화면 중앙선을 지나는 섹션 — 키가 큰 섹션에도 동작
  activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const idx = SECTION_IDS.indexOf(e.target.id as (typeof SECTION_IDS)[number])
        if (idx >= 0) activeIndex.value = idx
      })
    },
    { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
  )
  sections.forEach((s) => {
    revealObserver?.observe(s)
    activeObserver?.observe(s)
  })

  // 다른 페이지에서 `/#services` 등으로 들어온 경우 해당 섹션으로 이동
  const hashId = route.hash.replace('#', '')
  if (hashId) requestAnimationFrame(() => goTo(hashId, 'instant'))
})

onUnmounted(() => {
  document.documentElement.classList.remove(SNAP_ROOT_CLASS)
  revealObserver?.disconnect()
  activeObserver?.disconnect()
})
</script>
