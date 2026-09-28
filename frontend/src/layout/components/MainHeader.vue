<template>
  <q-header :class="['app-header', $q.dark.isActive ? 'app-header--dark' : '']">
    <q-toolbar class="app-toolbar">
      <!-- Hamburger -->
      <q-btn
        v-if="!userStore.isWorker"
        flat round dense
        :icon="layoutStore.drawerLeft ? 'close' : 'menu'"
        class="app-header__menu-btn"
        aria-keyshortcuts="F4"
        @click="layoutStore.toggleLeftDrawer()"
      >
        <q-tooltip>{{ t('layout.sidebarShortcut') }}</q-tooltip>
      </q-btn>

      <!-- Brand -->
      <router-link :to="userStore.isWorker ? { name: 'TaskListMobile' } : { name: 'home' }" class="app-header__brand">
        Voyagerss
      </router-link>

      <q-space />

      <!-- Desktop module nav -->
      <nav v-if="!userStore.isWorker" class="app-header__module-nav">
        <router-link
          v-for="mod in moduleRoutes"
          :key="String(mod.name)"
          :to="{ name: mod.name }"
          :class="['module-link', { 'module-link--active': isModuleActive(mod.path as string) }]"
        >
          <q-icon :name="(mod.meta as any)?.icon" size="16px" class="q-mr-xs" />
          {{ formatRouteLabel(mod) }}
        </router-link>
      </nav>

      <!-- Desktop common nav -->
      <nav v-if="!userStore.isWorker" class="app-header__common-nav">
        <router-link
          v-for="route in filteredRoutes"
          :key="String(route.name)"
          :to="{ name: route.name }"
          class="common-link"
        >
          {{ formatRouteLabel(route) }}
        </router-link>
      </nav>

      <!-- User button -->
      <q-btn flat round dense class="app-header__user-btn" @click="layoutStore.toggleRightDrawer()">
        <q-avatar size="22px" color="primary" text-color="white">
          <img v-if="userStore.user?.profileImageUrl" :src="userStore.user.profileImageUrl" />
          <q-icon v-else name="person" size="18px" />
        </q-avatar>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import type { RouteRecordNormalized } from 'vue-router'
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const $q          = useQuasar()
const layoutStore = useLayoutStore()
const userStore   = useUserStore()
const route       = useRoute()
const router      = useRouter()

const filteredRoutes = computed(() => {
  const excludedNames = [
    'PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup',
    'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden',
    'NotFound', 'Aviation', 'Workschd', 'Aipr', 'Vision', 'Admin', 'Dashboard'
  ]
  return router.options.routes
    .filter((r: any) => !excludedNames.includes(r.name as string) && !r.hidden && !r.meta?.hidden)
    .slice(0, 3)
})

const MODULE_ROUTE_CODES: Record<string, string> = {
  Aviation: 'aviation',
  Workschd: 'workschd',
  Aipr: 'aipr',
  Vision: 'vision'
}

function canAccessModule(moduleCode: string): boolean {
  if (import.meta.env.DEV) return true
  const profile = userStore.rbacProfile
  if (!profile) return false
  if (profile.isAdmin) return true
  return profile.modules.includes(moduleCode)
}

const moduleRoutes = computed(() => {
  const moduleNames = ['Aviation', 'Workschd', 'Aipr', 'Vision']
  return router.options.routes.filter((r: any) => {
    if (!moduleNames.includes(r.name as string)) return false
    const code = MODULE_ROUTE_CODES[r.name as string]
    return code ? canAccessModule(code) : false
  })
})

function isModuleActive(modulePath: string) {
  return route.path.startsWith(modulePath)
}

const MODULE_LABEL_KEYS: Record<string, string> = {
  Aviation: 'modules.aviation',
  Workschd: 'modules.workschd',
  Aipr: 'modules.aipr',
  Vision: 'modules.vision',
}

function formatRouteLabel(routeRecord: RouteRecordNormalized) {
  const titleKey = routeRecord.meta?.titleKey
  if (typeof titleKey === 'string') return t(titleKey)
  const name = routeRecord.name
  if (!name) return ''
  const str = String(name)
  const moduleLabelKey = MODULE_LABEL_KEYS[str]
  if (moduleLabelKey) return t(moduleLabelKey)
  return str.replace(/([A-Z])/g, ' $1').trim().replace(/^./, s => s.toUpperCase())
}
</script>

<style scoped lang="scss">
.app-header {
  background: var(--voy-header-bg, rgba(255,255,255,0.85));
  border-bottom: 1px solid var(--voy-header-border, rgba(0,0,0,0.05));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--voy-header-text, #1d1d1f);
  min-height: var(--voy-header-height, 44px);
  height: var(--voy-header-height, 44px);
  transition: background var(--voy-transition, 220ms), border-color var(--voy-transition, 220ms);

  &--dark {
    background: var(--voy-header-bg, rgba(26,26,26,0.9));
    color: var(--voy-text, #f5f5f7);
  }
}

.app-toolbar {
  min-height: var(--voy-header-height, 44px);
  height: var(--voy-header-height, 44px);
  padding: 0 10px;
  gap: 4px;
}

.app-header__menu-btn {
  color: var(--voy-header-text, #1d1d1f);
  opacity: 0.7;

  &:hover { opacity: 1; }
}

.app-header__brand {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--voy-primary, #0037EB);
  text-decoration: none;
  white-space: nowrap;
}

// Module nav (Aviation / WorkSchd / AIPR / Vision)
.app-header__module-nav {
  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 1023px) { display: none; }
}

.module-link {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--voy-radius-sm, 8px);
  font-size: 12px;
  font-weight: 500;
  color: var(--voy-text-secondary, #6e6e73);
  text-decoration: none;
  transition: background var(--voy-transition-fast, 150ms), color var(--voy-transition-fast, 150ms);

  &:hover {
    background: rgba(0, 55, 235, 0.06);
    color: var(--voy-primary, #0037EB);
  }

  &--active {
    background: rgba(0, 55, 235, 0.08);
    color: var(--voy-primary, #0037EB);
    font-weight: 600;
  }
}

// Common nav (Home, About, etc.)
.app-header__common-nav {
  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 1023px) { display: none; }
}

.common-link {
  padding: 2px 8px;
  border-radius: var(--voy-radius-sm, 8px);
  font-size: 12px;
  font-weight: 400;
  color: var(--voy-text-secondary, #6e6e73);
  text-decoration: none;
  transition: color var(--voy-transition-fast, 150ms), background var(--voy-transition-fast, 150ms);

  &:hover {
    background: rgba(0,0,0,0.04);
    color: var(--voy-text, #1d1d1f);
  }
}

.app-header__user-btn {
  margin-left: 4px;
}
</style>
