import { createI18n } from "vue-i18n";
import axios from "axios";
import apiSys from "@/api/public-modules/api-sys";

const userLocale = navigator.languages ? navigator.languages[0] : navigator.language || navigator.userLanguage;

export const i18n = new createI18n ({
  legacy: false,
  locale: import.meta.env.VITE_I18N_LOCALE || 'ko',
  fallbackLocale: userLocale,
  messages: {},
});

const loadedLanguages = [];

export function loadLanaguageAsync(lang) {
    if(!lang) lang = import.meta.env.VITE_I18N_LOCALE || 'ko'

  function setI18nLanguage (lang) {
    axios.defaults.headers.common['Accept-Language'] = lang
    document.querySelector('html').setAttribute('lang', lang)
      i18n.global.locale.value = lang
    return lang
  }

  if (loadedLanguages.includes(lang)) {
    if (i18n.locale !== lang) setI18nLanguage(lang)
    return Promise.resolve()
  }
 
  if (i18n.locale === lang) {
    return Promise.resolve(lang);
  }

  return apiSys.getSysI18n(lang)
      .then(response => {
        let msgs = response.ko
        loadedLanguages.push(lang)
        i18n.setLocaleMessage(lang, msgs)
        setI18nLanguage(lang)
      })

}
