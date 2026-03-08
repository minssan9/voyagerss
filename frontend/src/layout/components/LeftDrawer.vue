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

        <sidebar-item v-for="route in filteredRoutes" :key="route.path" :item="route" :base-path="route.path" />
      </nav>
    </q-scroll-area>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import SidebarItem from './SidebarItem.vue'

const layoutStore = useLayoutStore()
const userStore = useUserStore()
const { drawerLeft } = storeToRefs(layoutStore)
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

// Watch drawer state from store
const unwatchDrawer = layoutStore.$subscribe(() => {
  sidebarOpen.value = drawerLeft.value
})

// Filter out hidden routes
const filteredRoutes = computed(() => {
  return filterHiddenRoutes([...router.options.routes])
})


// Updated helper function to filter hidden and role-based routes
function filterHiddenRoutes(routes: any[]) {
  const fileterd = routes.filter(route => {
    // Top Level Exclusions (legacy logic - kept for safety but can be moved to meta.hidden)
    const excludedNames = ['PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup', 'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden', 'NotFound']
    if (excludedNames.includes(route.name)) return false
    
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
      // return accessibleChildren.length > 0 // Allow parents even if children are hidden? No, standard logic is hide if no children.
      if (accessibleChildren.length === 0) {
        return false // Hide parent if no accessible children
      }
    }

    return true
  })
  return fileterd
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
