<template>
  <header class="cl-nav" :class="{ 'cl-nav--scrolled': scrolled || menuOpen }">
    <div class="cl-nav__inner">
      <router-link to="/" class="cl-nav__brand" @click="onBrand">VoyagerSS<span class="cl-nav__brand-dot">.</span>AI</router-link>

      <nav class="cl-nav__links" :aria-label="t('consulting.nav.menu')">
        <a
          v-for="id in SECTION_LINKS"
          :key="id"
          :href="`/#${id}`"
          :class="{ 'cl-nav__link--active': activeId === id }"
          @click.prevent="goSection(id)"
        >{{ t(`consulting.nav.${id}`) }}</a>
        <router-link to="/consulting/documents" active-class="cl-nav__link--active">{{ t('consulting.nav.documents') }}</router-link>
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
        <router-link :to="accountLink.to" class="cl-btn cl-btn--outline cl-btn--sm cl-nav__account">{{ accountLink.label }}</router-link>
        <a v-if="mailtoHref" :href="mailtoHref" class="cl-btn cl-btn--primary cl-btn--sm cl-nav__contact">{{ t('consulting.nav.contact') }}</a>
        <button
          type="button"
          class="cl-nav__burger"
          :class="{ 'is-open': menuOpen }"
          :aria-expanded="menuOpen"
          :aria-label="t('consulting.nav.menu')"
          @click="menuOpen = !menuOpen"
        ><span /><span /></button>
      </div>
    </div>

  </header>

  <!-- header 의 backdrop-filter 가 fixed 기준이 되지 않도록 header 밖에 둔다 -->
  <!-- 전체 메뉴 패널 (모바일 + 데스크톱 보조 메뉴) -->
  <transition name="cl-menu">
    <div v-if="menuOpen" class="cl-menu" data-wheel-ignore @click.self="menuOpen = false">
      <div class="cl-menu__panel">
        <div class="cl-menu__group">
          <router-link to="/" class="cl-menu__link" @click="menuOpen = false">{{ t('consulting.nav.home') }}</router-link>
          <a v-for="id in SECTION_LINKS" :key="id" :href="`/#${id}`" class="cl-menu__link cl-menu__link--sub" @click.prevent="goSection(id)">
            {{ t(`consulting.nav.${id}`) }}
          </a>
        </div>
        <div class="cl-menu__group">
          <router-link to="/consulting/documents" class="cl-menu__link" @click="menuOpen = false">{{ t('consulting.nav.documents') }}</router-link>
          <router-link to="/about" class="cl-menu__link" @click="menuOpen = false">{{ t('consulting.nav.about') }}</router-link>
          <router-link to="/platform" class="cl-menu__link" @click="menuOpen = false">{{ t('consulting.nav.platform') }}</router-link>
          <router-link :to="accountLink.to" class="cl-menu__link" @click="menuOpen = false">{{ accountLink.label }}</router-link>
        </div>
        <div class="cl-menu__group cl-menu__group--muted">
          <router-link to="/privacy-policy" class="cl-menu__link cl-menu__link--sub" @click="menuOpen = false">Privacy Policy</router-link>
          <router-link to="/terms" class="cl-menu__link cl-menu__link--sub" @click="menuOpen = false">Terms of Service</router-link>
        </div>
        <a v-if="mailtoHref" :href="mailtoHref" class="cl-btn cl-btn--primary cl-menu__cta">{{ t('consulting.nav.contact') }}</a>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * AI 컨설팅 사이트 공통 헤더 (랜딩 `/`, 문서 안내 `/consulting/documents`)
 * - 섹션 링크: 랜딩에서는 부드럽게 스크롤, 다른 페이지에서는 `/#섹션`으로 이동
 * - 홈 · 소개 · 문서 제출 · 플랫폼 · 로그인(로그인 시 내 플랫폼) 진입점 제공
 *
 * 사용 예) <ConsultingHeader :active-id="currentSectionId" :scrolled="y > 0" />
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Cookies from 'js-cookie'
import { loadLanaguageAsync } from '@/locales/i18n'
import { useAppConfigStore } from '@/stores/common/store_app_config'
import { useUserStore } from '@/stores/common/store_user'

defineProps<{ activeId?: string; scrolled?: boolean }>()

const SECTION_LINKS = ['services', 'process', 'engagement', 'subscribe', 'faq'] as const
const LOCALE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' }
] as const

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const appConfig = useAppConfigStore()
const userStore = useUserStore()
const menuOpen = ref(false)

watch(() => route.fullPath, () => { menuOpen.value = false })

const isLoggedIn = computed(() => Boolean(userStore.accessToken || Cookies.get('accessToken')))
const accountLink = computed(() =>
  isLoggedIn.value
    ? { to: '/platform', label: t('consulting.nav.myPlatform') }
    : { to: { path: '/login', query: { redirect: '/platform' } }, label: t('consulting.nav.login') }
)

const mailtoHref = computed(() => {
  const email = appConfig.get('CONSULTING_CONTACT_EMAIL').trim()
  return email ? `mailto:${email}?subject=${encodeURIComponent(t('consulting.cta.mailSubject'))}` : ''
})

function goSection(id: string) {
  menuOpen.value = false
  if (route.path === '/') {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else {
    void router.push({ path: '/', hash: `#${id}` })
  }
}

function onBrand(e: MouseEvent) {
  if (route.path === '/') {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function onLocaleChange(next: string) {
  void loadLanaguageAsync(next, true)
}
</script>
