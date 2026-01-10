<template>
  <q-header :class="['modern-header', $q.dark.isActive ? 'bg-dark' : 'bg-transparent text-dark']">
    <q-toolbar class="q-py-md q-px-lg">
      <q-toolbar-title class="text-weight-bold text-h5 row items-center no-wrap">
        <router-link :to="{ name: 'home' }"
          :class="['text-decoration-none', $q.dark.isActive ? 'text-white' : 'text-primary']"
          style="font-family: 'Poppins', sans-serif; letter-spacing: -0.03em;">
          Voyagerss
        </router-link>
      </q-toolbar-title>

      <!-- Desktop Navigation -->
      <nav class="nav-menu row items-center">
        <template v-for="route in filteredRoutes" :key="route.name">
          <q-btn :to="{ name: route.name }" flat
            :class="['nav-btn', $q.dark.isActive ? 'text-white' : 'text-dark', { 'text-primary': route.name === route.name }]"
            :label="formatRouteName(route.name)" dense no-caps />
        </template>
      </nav>

      <!-- Module Links -->
      <nav class="module-menu row items-center">
        <template v-for="module in moduleRoutes" :key="module.name">
          <q-btn :to="{ name: module.name }" flat
            :class="['nav-btn', $q.dark.isActive ? 'text-white' : 'text-dark']"
            :label="formatRouteName(module.name)" dense no-caps />
        </template>
      </nav>

      <!-- Mobile Menu Button - Visible on all screens now -->
      <q-btn flat @click="layoutStore.toggleLeftDrawer()" round dense :icon="layoutStore.drawerLeft ? 'close' : 'menu'"
        :color="$q.dark.isActive ? 'white' : 'dark'" />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { onMounted, computed } from "vue";
import { useRoute, useRouter } from 'vue-router'

const $q = useQuasar()
const layoutStore = useLayoutStore()

onMounted(() => {
  // Logic to fetch routes similar to LeftDrawer but only top 4
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Filter logic (simplified from LeftDrawer)
const filteredRoutes = computed(() => {
  const routes = [...router.options.routes]
  return routes.filter((r: any) => {
    // Basic exclusions
    const excludedNames = ['PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup', 'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden', 'NotFound', 'Aviation', 'Investand', 'Workschd', 'Admin', 'Dashboard']
    if (excludedNames.includes(r.name as string)) return false
    if (r.hidden) return false
    return true
  }).slice(0, 4) // Limit to 4
})

// Module routes for the 3 main modules
const moduleRoutes = computed(() => {
  const routes = [...router.options.routes]
  const moduleNames = ['Aviation', 'Investand', 'Workschd']
  return routes.filter((r: any) => moduleNames.includes(r.name as string))
})

function formatRouteName(name: string | symbol | undefined | null) {
  if (!name) return ''
  return String(name)
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase())
}
</script>

<style scoped lang="scss">
.modern-header {
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &.q-header--hidden {
    transform: translateY(-100%);
  }
}

.nav-menu {
  display: flex;
  gap: 24px;
  margin-right: auto;

  @media (max-width: 1023px) {
    display: none;
  }

  .nav-btn {
    font-weight: 500;
    font-size: 15px;
    letter-spacing: -0.01em;
    opacity: 0.7;
    transition: all 0.2s;

    &:hover,
    &.active {
      opacity: 1;
      background: transparent;

      &::before {
        display: none;
      }
    }
  }
}

.module-menu {
  display: flex;
  gap: 16px;
  margin-right: 16px;

  @media (max-width: 1023px) {
    display: none;
  }

  .nav-btn {
    font-weight: 500;
    font-size: 15px;
    letter-spacing: -0.01em;
    opacity: 0.7;
    transition: all 0.2s;

    &:hover,
    &.active {
      opacity: 1;
      background: transparent;

      &::before {
        display: none;
      }
    }
  }
}
</style>
