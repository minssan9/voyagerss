import { FirebaseApp } from 'firebase/app'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $firebase: FirebaseApp
  }
} 