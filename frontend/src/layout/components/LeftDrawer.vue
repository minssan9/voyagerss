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
        <!-- Common Section -->
        <div class="nav-section-label">Platform</div>
        <sidebar-item
          v-for="route in commonFilteredRoutes"
          :key="route.path"
          :item="route"
          :base-path="route.path"
        />

        <div class="nav-divider" />

        <!-- Project Sections — all collapsible -->
        <q-expansion-item
          v-for="proj in projectSections"
          :key="proj.key"
          :default-opened="currentProject === proj.key"
          :header-class="['nav-project-header', { 'nav-project-header--active': currentProject === proj.key }]"
          expand-icon-class="nav-project-expand"
          dense
        >
          <template #header>
            <q-item-section avatar>
              <q-icon :name="proj.icon" size="18px" />
            </q-item-section>
            <q-item-section>
              <span class="nav-project-label">{{ proj.label }}</span>
            </q-item-section>
          </template>

          <div class="nav-project-children">
            <sidebar-item
              v-for="child in proj.children"
              :key="child.path"
              :item="child"
              :base-path="resolveSectionPath(proj.basePath, child.path)"
            />
          </div>
        </q-expansion-item>
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

const currentProject = computed(() => {
  const path = route.path
  if (path.startsWith('/aviation')) return 'aviation'
  if (path.startsWith('/investand')) return 'investand'
  if (path.startsWith('/workschd')) return 'workschd'
  if (path.startsWith('/aipr')) return 'aipr'
  return null
})

interface ProjectSection {
  key: string
  label: string
  icon: string
  basePath: string
  children: any[]
}

const projectSections = computed<ProjectSection[]>(() => {
  const allRoutes = [...router.options.routes]
  const projectMeta: Record<string, { label: string; icon: string }> = {
    aviation:  { label: 'Aviation',      icon: 'flight'           },
    investand: { label: 'Investand',     icon: 'show_chart'       },
    workschd:  { label: 'WorkSchd',      icon: 'business_center'  },
    aipr:      { label: 'AI Operations', icon: 'settings_suggest' },
  }

  const sections: ProjectSection[] = []

  for (const r of allRoutes) {
    const project = (r.meta as any)?.project as string | undefined
    if (project && projectMeta[project]) {
      const info = projectMeta[project]
      const visibleChildren = (r.children || []).filter((child: any) => {
        if (child.hidden || child.meta?.hidden) return false
        if (child.path === '' && child.redirect) return false
        if (child.meta?.roles?.length) {
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

const commonFilteredRoutes = computed(() => {
  const allRoutes = [...router.options.routes]
  const excludedNames = [
    'PrivacyPolicy', 'Terms', 'login', 'redirect', 'Signup',
    'AccountProfile', 'AccountSchedule', 'Unauthorized', 'Forbidden',
    'NotFound', 'Aviation', 'Investand', 'Workschd', 'WorkschdLogin',
    'Aipr', 'AuthCallback', 'Dashboard'
  ]

  return allRoutes.filter((r: any) => {
    if (excludedNames.includes(r.name as string)) return false
    if (r.hidden || r.meta?.hidden) return false
    if (r.meta?.project) return false
    return true
  })
})

function resolveSectionPath(basePath: string, childPath: string) {
  if (childPath.startsWith('/')) return childPath
  const base = basePath.endsWith('/') ? basePath : basePath + '/'
  return (base + childPath).replace(/\/+/g, '/')
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 1024
}

const closeSidebar = () => {
  sidebarOpen.value = false
  layoutStore.setLeftDrawer(false)
}

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

defineExpose({
  toggle: () => {
    sidebarOpen.value = !sidebarOpen.value
    layoutStore.setLeftDrawer(sidebarOpen.value)
  }
})
</script>

<style scoped lang="scss">
// Project section header inside q-expansion-item
:deep(.nav-project-header) {
  color: var(--voy-sidebar-text-muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  transition: color var(--voy-transition-fast, 150ms);

  &:hover {
    background: var(--voy-sidebar-hover-bg);
    color: rgba(255, 255, 255, 0.7);
  }

  &.nav-project-header--active {
    color: rgba(255, 255, 255, 0.9);
  }

  .q-icon {
    color: inherit;
  }
}

:deep(.nav-project-expand) {
  color: var(--voy-sidebar-text-muted) !important;
  font-size: 16px !important;
}

.nav-project-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.nav-project-children {
  padding-left: 8px;
}

.nav-divider {
  height: 1px;
  background: var(--voy-sidebar-section-border);
  margin: 8px 12px;
}
</style>
