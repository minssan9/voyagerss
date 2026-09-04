import { createI18n } from "vue-i18n";
import axios from "axios";
import apiSys from "@/api/system/api-sys";

const STORAGE_KEY_LOCALE = 'voy-locale';
const DEFAULT_LOCALE = import.meta.env.VITE_I18N_LOCALE || 'ko';

const savedLocale = localStorage.getItem(STORAGE_KEY_LOCALE) || DEFAULT_LOCALE;

export const i18n = new createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {},
});

const loadedLanguages = [];

function setI18nLanguage(lang) {
  axios.defaults.headers.common['Accept-Language'] = lang;
  document.querySelector('html').setAttribute('lang', lang);
  i18n.global.locale.value = lang;
  localStorage.setItem(STORAGE_KEY_LOCALE, lang);
  return lang;
}

export function loadLanaguageAsync(lang) {
  if (!lang) lang = savedLocale;

  if (loadedLanguages.includes(lang)) {
    setI18nLanguage(lang);
    return Promise.resolve(lang);
  }

  return apiSys.getSysI18n(lang)
    .then(response => {
      const msgs = response.data;
      if (msgs && typeof msgs === 'object') {
        loadedLanguages.push(lang);
        i18n.global.setLocaleMessage(lang, msgs);
        setI18nLanguage(lang);
      }
      return lang;
    })
    .catch(() => {
      // silently fallback — keep previous locale
    });
}


