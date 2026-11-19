import { createI18n } from 'vue-i18n'
import axios from 'axios'

// 사용자가 직접 고른 언어만 저장한다. 저장값이 없으면 브라우저 언어를 따른다.
const STORAGE_KEY_LOCALE = 'voy-locale-pref'
const DEFAULT_LOCALE = import.meta.env.VITE_I18N_LOCALE || 'ko'
// 브라우저 언어가 지원 목록에 없을 때 (예: fr, de) 사용할 언어
const BROWSER_FALLBACK_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['ko', 'en', 'ja']

function primaryOf(lang) {
  return String(lang || '').toLowerCase().split('-')[0]
}

function normalizeLocale(lang) {
  const primary = primaryOf(lang || DEFAULT_LOCALE)
  return SUPPORTED_LOCALES.includes(primary) ? primary : DEFAULT_LOCALE
}

export function detectBrowserLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const lang of candidates) {
    const primary = primaryOf(lang)
    if (SUPPORTED_LOCALES.includes(primary)) return primary
  }
  return BROWSER_FALLBACK_LOCALE
}

function readSavedLocale() {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_LOCALE) : null
    if (saved && SUPPORTED_LOCALES.includes(primaryOf(saved))) return primaryOf(saved)
  } catch {
    // storage 접근 불가 (private mode 등)
  }
  return detectBrowserLocale()
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      deepMerge(current, value)
    } else {
      target[key] = value
    }
  }
  return target
}

function buildMessages() {
  const messages = Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, {}]))
  const modules = import.meta.glob('./*/*.json', { eager: true })
  for (const [filePath, mod] of Object.entries(modules)) {
    const match = filePath.match(/\.\/(ko|en|ja)\/([^/]+)\.json$/)
    if (!match) continue
    const lang = match[1]
    const data = mod.default ?? mod
    deepMerge(messages[lang], data)
  }
  return messages
}

const savedLocale = readSavedLocale()

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  // ja 는 랜딩 외 화면 번역이 없으므로 en → ko 순으로 대체
  fallbackLocale: { ja: ['en', 'ko'], default: ['ko'] },
  missingWarn: false,
  fallbackWarn: false,
  messages: buildMessages(),
})

function setI18nLanguage(lang, persist = false) {
  const next = normalizeLocale(lang)
  axios.defaults.headers.common['Accept-Language'] = next
  if (typeof document !== 'undefined') {
    document.querySelector('html')?.setAttribute('lang', next)
  }
  i18n.global.locale.value = next
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY_LOCALE, next)
    } catch {
      // ignore
    }
  }
  return next
}

/**
 * 언어 적용. persist=true 는 사용자가 직접 선택한 경우에만 사용한다.
 * 예) 언어 선택 UI: loadLanaguageAsync('ja', true)
 */
export function loadLanaguageAsync(lang, persist = false) {
  return Promise.resolve(setI18nLanguage(lang || savedLocale, persist))
}

setI18nLanguage(savedLocale)
