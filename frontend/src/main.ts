import './assets/styles/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import { i18n } from "@/locales/i18n";
// Module Styles
import '@/modules/aviation/styles/app.sass'
import '@/modules/investand/css/app.scss'

// import { app as firebaseApp } from './firebase/config'  // Import Firebase

const app = createApp(App)
const pinia = createPinia()


app.use(i18n);
app.use(pinia)
app.use(router)

app.use(Quasar, {
  plugins: { Notify, Dialog, Loading }, // register Quasar plugins
  config: {
    notify: {
      /* Notify defaults */
      position: 'top-right',
      timeout: 2500,
      textColor: 'white'
    }
  }
})


// Make Firebase available throughout the app
// app.config.globalProperties.$firebase = firebaseApp 

declare global {
  interface Window {
    Kakao: any;
  }
}

// window.Kakao.init(import.meta.env.VITE_KAKAO_CLIENT_ID);

app.mount('#app')
