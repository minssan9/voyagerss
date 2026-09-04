<template>
  <q-header :class="['app-header', $q.dark.isActive ? 'app-header--dark' : '']">
    <q-toolbar class="app-toolbar">
      <!-- Hamburger -->
      <q-btn
        flat round dense
        :icon="layoutStore.drawerLeft ? 'close' : 'menu'"
        class="app-header__menu-btn"
        @click="layoutStore.toggleLeftDrawer()"
      />

      <!-- Brand -->
      <router-link :to="{ name: 'home' }" class="app-header__brand">
        Voyagerss
      </router-link>

      <q-space />

      <!-- Desktop module nav -->
      <nav class="app-header__module-nav">
        <router-link
          v-for="mod in moduleRoutes"
          :key="String(mod.name)"
          :to="{ name: mod.name }"
          :class="['module-link', { 'module-link--active': isModuleActive(mod.path as string) }]"
        >
          <q-icon :name="(mod.meta as any)?.icon" size="16px" class="q-mr-xs" />
          {{ formatRouteName(mod.name) }}
        </router-link>
      </nav>

      <!-- Desktop common nav -->
      <nav class="app-header__common-nav">
        <router-link
          v-for="route in filteredRoutes"
          :key="String(route.name)"
          :to="{ name: route.name }"
          class="common-link"
        >
          {{ formatRouteName(route.name) }}
        </router-link>
      </nav>

      <!-- User button -->
      <q-btn flat round dense class="app-header__user-btn" @click="layoutStore.toggleRightDrawer()">
        <q-avatar size="30px" color="primary" text-color="white">
          <img v-if="userStore.user?.profileImageUrl" :src="userStore.user.profileImageUrl" />
          <q-icon v-else name="person" size="18px" />
        </q-avatar>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { useRoute, useRouter } from 'vue-router'

const $q          = useQuasar()
const layoutStore = useLayoutStore()
const userStore   = useUserStore()
const route       = useRoute()
const router      = useRouter()

const filteredRoutes = computed(() => {
  const excludedNames = [
    'PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup',
    'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden',
    'NotFound', 'Aviation', 'Investand', 'Workschd', 'Aipr', 'Admin', 'Dashboard'
  ]
  return router.options.routes
    .filter((r: any) => !excludedNames.includes(r.name as string) && !r.hidden && !r.meta?.hidden)
    .slice(0, 3)
})

const moduleRoutes = computed(() => {
  const moduleNames = ['Aviation', 'Investand', 'Workschd', 'Aipr']
  return router.options.routes.filter((r: any) => moduleNames.includes(r.name as string))
})

function isModuleActive(modulePath: string) {
  return route.path.startsWith(modulePath)
}

function formatRouteName(name: string | symbol | undefined | null) {
  if (!name) return ''
  const str = String(name)
  if (str === 'Aipr') return 'AI Operations'
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
  height: var(--voy-header-height, 64px);
  transition: background var(--voy-transition, 220ms), border-color var(--voy-transition, 220ms);

  &--dark {
    background: var(--voy-header-bg, rgba(26,26,26,0.9));
    color: var(--voy-text, #f5f5f7);
  }
}

.app-toolbar {
  height: var(--voy-header-height, 64px);
  padding: 0 16px;
  gap: 8px;
}

.app-header__menu-btn {
  color: var(--voy-header-text, #1d1d1f);
  opacity: 0.7;

  &:hover { opacity: 1; }
}

.app-header__brand {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--voy-primary, #0037EB);
  text-decoration: none;
  white-space: nowrap;
}

// Module nav (Aviation / Investand / WorkSchd)
.app-header__module-nav {
  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 1023px) { display: none; }
}

.module-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--voy-radius-sm, 8px);
  font-size: 13.5px;
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
  padding: 6px 10px;
  border-radius: var(--voy-radius-sm, 8px);
  font-size: 13.5px;
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
