import { createI18n } from 'vue-i18n'
import axios from 'axios'

const STORAGE_KEY_LOCALE = 'voy-locale'
const DEFAULT_LOCALE = import.meta.env.VITE_I18N_LOCALE || 'ko'
const SUPPORTED_LOCALES = ['ko', 'en']

function normalizeLocale(lang) {
  const primary = String(lang || DEFAULT_LOCALE).toLowerCase().split('-')[0]
  return SUPPORTED_LOCALES.includes(primary) ? primary : DEFAULT_LOCALE
}

function readSavedLocale() {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(localStorage.getItem(STORAGE_KEY_LOCALE) || DEFAULT_LOCALE)
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
  const messages = { ko: {}, en: {} }
  const modules = import.meta.glob('./*/*.json', { eager: true })
  for (const [filePath, mod] of Object.entries(modules)) {
    const match = filePath.match(/\.\/(ko|en)\/([^/]+)\.json$/)
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
  fallbackLocale: 'ko',
  messages: buildMessages(),
})

function setI18nLanguage(lang) {
  const next = normalizeLocale(lang)
  axios.defaults.headers.common['Accept-Language'] = next
  if (typeof document !== 'undefined') {
    document.querySelector('html')?.setAttribute('lang', next)
  }
  i18n.global.locale.value = next
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_LOCALE, next)
  }
  return next
}

export function loadLanaguageAsync(lang) {
  return Promise.resolve(setI18nLanguage(lang || savedLocale))
}

setI18nLanguage(savedLocale)
