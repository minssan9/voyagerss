<template>
  <!-- Mobile Overlay -->
  <div v-if="sidebarOpen && isMobile" class="mobile-overlay" @click="closeSidebar" />

  <!-- Sidebar Navigation -->
  <aside :class="['sidebar', { open: sidebarOpen }]">
    <div class="sidebar-header">
      <div class="logo-wrapper">
        <div class="logo-icon">
          <span>V</span>
        </div>
        <div class="logo-text">
          <h1>Voyager</h1>
          <span class="logo-badge">Enterprise</span>
        </div>
      </div>
      <q-btn flat round dense icon="close" class="close-btn" @click="closeSidebar" />
    </div>

    <q-scroll-area class="sidebar-nav-wrapper">
      <nav class="sidebar-nav">
        <!-- Main Platform Section -->
        <div class="nav-section-title">Platform</div>

        <!-- Other Modules Section -->
        <template v-for="routeProp in filteredRoutes" :key="routeProp.name">
          <template v-if="shouldShowRoute(routeProp)">
            <!-- Routes with children - show section title always -->
            <template v-if="routeProp.children">
              <template v-if="filterHiddenRoutes(routeProp.children).length > 0">
                <div class="nav-section-title">{{ formatRouteName(routeProp.name) }}</div>
                <button v-for="child in filterHiddenRoutes(routeProp.children)" :key="child.name" type="button"
                  :class="['nav-item', { active: route.name === child.name }]"
                  @click="handleManualNavigate(child.name)">
                  <q-icon :name="child.meta?.icon || 'label'"
                    :class="['nav-icon', { active: route.name === child.name }]" />
                  <span>{{ formatRouteName(child.name) }}</span>
                  <q-icon v-if="route.name === child.name" name="chevron_right" class="nav-chevron" />
                </button>
              </template>
            </template>

            <!-- Routes without children - show as standalone items -->
            <template v-else>
              <button type="button" :class="['nav-item', { active: route.name === routeProp.name }]"
                @click="handleManualNavigate(routeProp.name)">
                <q-icon :name="routeProp.meta?.icon || 'label'"
                  :class="['nav-icon', { active: route.name === routeProp.name }]" />
                <span>{{ formatRouteName(routeProp.name) }}</span>
                <q-icon v-if="route.name === routeProp.name" name="chevron_right" class="nav-chevron" />
              </button>
            </template>
          </template>
        </template>
      </nav>
    </q-scroll-area>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const layoutStore = useLayoutStore()
const userStore = useUserStore()
const { drawerLeft } = storeToRefs(layoutStore)
const route = useRoute()
const router = useRouter()

const sidebarOpen = ref(drawerLeft.value)
const isMobile = ref(window.innerWidth < 1024)

// Handle window resize
const handleResize = () => {
  isMobile.value = window.innerWidth < 1024
}

// Close sidebar (for mobile)
const closeSidebar = () => {
  sidebarOpen.value = false
  layoutStore.setLeftDrawer(false)
}

// Handle navigation
const handleManualNavigate = (name: string | symbol | undefined | null) => {
  if (!name) return
  router.push({ name: name as string }).catch(err => {
    // Ignore duplicate navigation errors
    if (err.name !== 'NavigationDuplicated') {
      console.error(err)
    }
  })
  if (isMobile.value) {
    closeSidebar()
  }
}

// Watch drawer state from store
const unwatchDrawer = layoutStore.$subscribe(() => {
  sidebarOpen.value = drawerLeft.value
})

// Filter out hidden routes
const filteredRoutes = computed(() => {
  return filterHiddenRoutes([...router.options.routes])
})

// Check if route should be shown (exclude home, about, dashboard, findash parent, investand parent path only)
function shouldShowRoute(route: any) {
  const excludedNames = ['PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup', 'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden', 'NotFound']
  const excludedPaths = []

  if (excludedNames.includes(route.name)) return false
  if (excludedPaths.includes(route.path)) return false
  if (route.hidden) return false

  return true
}

// Updated helper function to filter hidden and role-based routes
function filterHiddenRoutes(routes: any[]) {
  return routes.filter(route => {
    // Filter out hidden routes
    if (route.hidden) return false

    // If route has children, check if at least one child is accessible
    if (route.children) {
      const accessibleChildren = route.children.filter((child: any) =>
        !child.hidden &&
        (!child.meta?.roles || (userStore.user.accountRoles &&
          child.meta.roles.some((role: string) =>
            userStore.user.accountRoles.some((ar: any) => ar.roleType === role)
          )))
      )
      return accessibleChildren.length > 0
    }

    return true
  })
}

// Format route name for display
function formatRouteName(name: string | undefined | null) {
  if (!name) return ''
  return String(name)
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase())
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  unwatchDrawer()
})

// Expose method to toggle sidebar (can be called from parent)
defineExpose({
  toggle: () => {
    sidebarOpen.value = !sidebarOpen.value
    layoutStore.setLeftDrawer(sidebarOpen.value)
  }
})
</script>
