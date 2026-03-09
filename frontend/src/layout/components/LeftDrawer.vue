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
        <!-- Common Section (always visible) -->
        <div class="nav-section-title">Platform</div>
        <sidebar-item v-for="route in commonFilteredRoutes" :key="route.path" :item="route" :base-path="route.path" />

        <q-separator class="q-my-sm" />

        <!-- Project Sections -->
        <template v-for="proj in projectSections" :key="proj.key">
          <div
            :class="['nav-section-title', 'project-section', { 'active-project': currentProject === proj.key }]"
          >
            <q-icon :name="proj.icon" size="18px" class="q-mr-xs" />
            {{ proj.label }}
          </div>
          <!-- Show children only if this project is active -->
          <template v-if="currentProject === proj.key">
            <sidebar-item
              v-for="child in proj.children"
              :key="child.path"
              :item="child"
              :base-path="resolveSectionPath(proj.basePath, child.path)"
            />
          </template>
          <!-- Collapsed: show entry link -->
          <q-item
            v-else
            clickable v-ripple
            class="nav-item project-entry-link"
            @click="navigateTo(proj.basePath)"
          >
            <q-item-section avatar>
              <q-icon :name="proj.icon" />
            </q-item-section>
            <q-item-section>{{ proj.label }} 바로가기</q-item-section>
            <q-item-section side>
              <q-icon name="arrow_forward" size="16px" />
            </q-item-section>
          </q-item>
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
import { useRouter, useRoute } from 'vue-router'
import SidebarItem from './SidebarItem.vue'

const layoutStore = useLayoutStore()
const userStore = useUserStore()
const { drawerLeft } = storeToRefs(layoutStore)
const router = useRouter()
const route = useRoute()

const sidebarOpen = ref(drawerLeft.value)
const isMobile = ref(window.innerWidth < 1024)

// ─── Detect current active project from route path ───────────────
const currentProject = computed(() => {
  const path = route.path
  if (path.startsWith('/aviation')) return 'aviation'
  if (path.startsWith('/investand')) return 'investand'
  if (path.startsWith('/workschd')) return 'workschd'
  return null
})

// ─── Project section definitions ─────────────────────────────────
interface ProjectSection {
  key: string
  label: string
  icon: string
  basePath: string
  children: any[]
}

const projectSections = computed<ProjectSection[]>(() => {
  const allRoutes = [...router.options.routes]
  const projectNames: Record<string, { label: string; icon: string }> = {
    aviation: { label: 'Aviation', icon: 'flight' },
    investand: { label: 'Investand', icon: 'show_chart' },
    workschd: { label: 'WorkSchd', icon: 'business_center' },
  }

  const sections: ProjectSection[] = []

  for (const r of allRoutes) {
    const project = (r.meta as any)?.project as string | undefined
    if (project && projectNames[project]) {
      const info = projectNames[project]
      // Get visible children
      const visibleChildren = (r.children || []).filter((child: any) => {
        if (child.hidden) return false
        if (child.meta?.hidden) return false
        if (child.path === '' && child.redirect) return false // skip redirect-only
        // Role check
        if (child.meta?.roles && child.meta.roles.length > 0) {
          if (!userStore.user?.accountRoles) return false
          const hasRole = child.meta.roles.some((role: string) =>
            userStore.user.accountRoles.some((ar: any) => ar.roleType === role)
          )
          if (!hasRole) return false
        }
        return true
      })
      sections.push({
        key: project,
        label: info.label,
        icon: info.icon,
        basePath: r.path as string,
        children: visibleChildren,
      })
    }
  }

  return sections
})

// ─── Common routes (non-project, non-hidden) ─────────────────────
const commonFilteredRoutes = computed(() => {
  const allRoutes = [...router.options.routes]
  const excludedNames = [
    'PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup',
    'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden',
    'NotFound', 'Aviation', 'Investand', 'Workschd', 'WorkschdLogin',
    'AuthCallback', 'Dashboard'
  ]

  return allRoutes.filter((r: any) => {
    if (excludedNames.includes(r.name as string)) return false
    if (r.hidden) return false
    if (r.meta?.hidden) return false
    if (r.meta?.project) return false // sub-project routes handled separately
    return true
  })
})

// ─── Helpers ─────────────────────────────────────────────────────
function resolveSectionPath(basePath: string, childPath: string) {
  if (childPath.startsWith('/')) return childPath
  const base = basePath.endsWith('/') ? basePath : basePath + '/'
  return (base + childPath).replace(/\/+/g, '/')
}

function navigateTo(path: string) {
  router.push(path).catch(err => {
    if (err.name !== 'NavigationDuplicated') console.error(err)
  })
}

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

<style scoped lang="scss">
.project-section {
  cursor: default;
  display: flex;
  align-items: center;
  padding: 8px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s ease;

  &.active-project {
    color: rgba(255, 255, 255, 0.85);
  }
}

.project-entry-link {
  opacity: 0.6;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
}
</style>
