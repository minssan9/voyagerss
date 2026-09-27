import './assets/styles/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { Quasar, Notify, Dialog, Loading, Dark } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './assets/styles/auth-contrast.scss'
import { i18n, loadLanaguageAsync } from "@/locales/i18n";

// import { app as firebaseApp } from './firebase/config'  // Import Firebase

const STORAGE_KEY_DARK = 'voy-dark';
const savedDark = localStorage.getItem(STORAGE_KEY_DARK);
// Resolve initial dark mode: saved pref > system preference
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
const initialDark = savedDark !== null ? savedDark === 'true' : prefersDark;

import { useAppConfigStore } from '@/stores/common/store_app_config'
import { setActivePinia } from 'pinia'
import { bootDevSession } from '@/boot/dev-auto-login'

declare global {
  interface Window {
    Kakao: any;
  }
}

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(i18n)
  app.use(pinia)
  setActivePinia(pinia)

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

  loadLanaguageAsync(i18n.global.locale.value)

  await useAppConfigStore().load()
  await bootDevSession()

  // Router install starts the first navigation immediately. Login must finish first,
  // or protected pages redirect to /401 before the dev session token exists.
  app.use(router)

  // window.Kakao.init(useAppConfigStore().get('VITE_KAKAO_CLIENT_ID'))

  app.mount('#app')
}

bootstrap()


