/// <reference types="vite/client" />

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    public?: boolean
    adminAuth?: boolean
    loginPath?: string
    hidden?: boolean
    icon?: string
    title?: string
    tabTitle?: string
    description?: string
    layout?: 'default' | 'blank' | 'minimal'
    project?: string
  }
}
