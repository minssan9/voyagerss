<template>
  <!-- Mobile Overlay -->
  <div 
    v-if="sidebarOpen && isMobile" 
    class="mobile-overlay"
    @click="closeSidebar"
  />

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
      <q-btn
        flat
        round
        dense
        icon="close"
        class="close-btn"
        @click="closeSidebar"
      />
    </div>

    <q-scroll-area class="sidebar-nav-wrapper">
      <nav class="sidebar-nav">
        <!-- Main Platform Section -->
        <div class="nav-section-title">Platform</div> 

        <!-- Other Modules Section -->
        <template v-for="route in filteredRoutes" :key="route.name">
          <template v-if="shouldShowRoute(route)">
            <!-- Routes with children - show section title always -->
            <template v-if="route.children">
              <template v-if="filterHiddenRoutes(route.children).length > 0">
                <div class="nav-section-title">{{ formatRouteName(route.name) }}</div>
                <router-link
                  v-for="child in filterHiddenRoutes(route.children)"
                  :key="child.name"
                  :to="{ name: child.name }"
                  custom
                  v-slot="{ isActive, navigate }"
                >
                  <button :class="['nav-item', { active: isActive }]" @click="handleNavigate(navigate)">
                    <q-icon :name="child.meta?.icon || 'label'" :class="['nav-icon', { active: isActive }]" />
                    <span>{{ formatRouteName(child.name) }}</span>
                    <q-icon v-if="isActive" name="chevron_right" class="nav-chevron" />
                  </button>
                </router-link>
              </template>
            </template>
            
            <!-- Routes without children - show as standalone items -->
            <template v-else>
              <router-link
                :to="{ name: route.name }"
                custom
                v-slot="{ isActive, navigate }"
              >
                <button :class="['nav-item', { active: isActive }]" @click="handleNavigate(navigate)">
                  <q-icon :name="route.meta?.icon || 'label'" :class="['nav-icon', { active: isActive }]" />
                  <span>{{ formatRouteName(route.name) }}</span>
                  <q-icon v-if="isActive" name="chevron_right" class="nav-chevron" />
                </button>
              </router-link>
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
const handleNavigate = (navigate: () => void) => {
  navigate()
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

<style lang="scss" scoped>
// Variables
$sidebar-bg: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
$sidebar-border: rgba(100, 116, 139, 0.2);
$sidebar-text: #cbd5e1;
$sidebar-text-active: #a78bfa;
$sidebar-bg-hover: rgba(100, 116, 139, 0.1);
$findash-slate-50: #f8fafc;
$findash-slate-100: #f1f5f9;
$findash-slate-200: #e2e8f0;
$findash-slate-300: #cbd5e1;
$findash-slate-400: #94a3b8;
$findash-slate-500: #64748b;
$findash-slate-600: #475569;
$findash-slate-700: #334155;
$findash-slate-800: #1e293b;
$findash-slate-900: #0f172a;
$findash-indigo: #6366f1;
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

// Mobile Overlay
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba($findash-slate-900, 0.6);
  z-index: 999;
  backdrop-filter: blur(4px);
}

// Sidebar
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  height: 100vh;
  width: 18rem;
  background: $sidebar-bg;
  color: white;
  transition: transform 0.3s ease-out, width 0.3s ease-out;
  border-right: 1px solid $sidebar-border;
  display: flex;
  flex-direction: column;
  box-shadow: $shadow-xl;
  transform: translateX(-100%);

  &.open {
    transform: translateX(0);
  }
}

.sidebar-header {
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba($sidebar-border, 0.5);
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 2.25rem;
  height: 2.25rem;
  background: $findash-indigo;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba($findash-indigo, 0.3);

  span {
    font-weight: 700;
    font-size: 1.125rem;
    color: white;
  }
}

.logo-text {
  h1 {
    font-weight: 700;
    font-size: 1.125rem;
    letter-spacing: -0.025em;
    line-height: 1;
    color: $findash-slate-100;
    margin: 0;
  }

  .logo-badge {
    font-size: 0.625rem;
    color: $sidebar-text-active;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
}

.close-btn {
  color: $findash-slate-400;

  &:hover {
    color: white;
  }

  @media (min-width: 1024px) {
    display: none;
  }
}

// Navigation wrapper
.sidebar-nav-wrapper {
  flex: 1;
  height: calc(100vh - 5rem);
  padding-bottom: 1rem; // Prevent bottom cutoff
}

// Navigation
.sidebar-nav {
  padding: 0 0.75rem;
  padding-top: 1rem; // Prevent top cutoff
  padding-bottom: 1rem; // Prevent bottom cutoff
}

.nav-section-title {
  padding: 0 0.75rem;
  margin-bottom: 0.5rem;
  margin-top: 1.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: $findash-slate-500;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &:first-child {
    margin-top: 0;
  }
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  color: $sidebar-text;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;

  &:hover {
    background: $sidebar-bg-hover;
    color: $findash-slate-200;
  }

  &.active {
    background: rgba($findash-indigo, 0.1);
    color: $sidebar-text-active;
    font-weight: 500;
  }
}

.nav-icon {
  font-size: 1.125rem;
  color: $findash-slate-500;

  &.active {
    color: $sidebar-text-active;
  }
}

.nav-chevron {
  margin-left: auto;
  opacity: 0.5;
  font-size: 0.875rem;
}
</style> 

