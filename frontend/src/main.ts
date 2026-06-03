import './assets/styles/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { Quasar, Notify, Dialog, Loading, Dark } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import { i18n, loadLanaguageAsync } from "@/locales/i18n";
// Module Styles
import '@/modules/aviation/views/styles/app.sass'
import '@/modules/investand/views/styles/app.scss'

// import { app as firebaseApp } from './firebase/config'  // Import Firebase

const STORAGE_KEY_DARK = 'voy-dark';
const savedDark = localStorage.getItem(STORAGE_KEY_DARK);
// Resolve initial dark mode: saved pref > system preference
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
const initialDark = savedDark !== null ? savedDark === 'true' : prefersDark;

const app = createApp(App)
const pinia = createPinia()

app.use(i18n);
app.use(pinia)
app.use(router)

app.use(Quasar, {
  plugins: { Notify, Dialog, Loading, Dark },
  config: {
    dark: initialDark,
    notify: {
      position: 'top-right',
      timeout: 2500,
      textColor: 'white'
    }
  }
})

// Load initial translations after Quasar/i18n are set up
loadLanaguageAsync(i18n.global.locale.value);


// Make Firebase available throughout the app
// app.config.globalProperties.$firebase = firebaseApp 

declare global {
  interface Window {
    Kakao: any;
  }
}

// window.Kakao.init(import.meta.env.VITE_KAKAO_CLIENT_ID);

app.mount('#app')


