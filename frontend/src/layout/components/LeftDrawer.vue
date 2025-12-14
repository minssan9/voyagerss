<template>
  <q-drawer 
    v-model="drawerLeft" 
    :width="200" 
    :breakpoint="700" 
    bordered
    @update:model-value="layoutStore.setLeftDrawer"
  > 
    <q-scroll-area class="drawer-side">
      <q-list>
        <!-- Info Section -->
        <!-- <q-item-label header>{{ t('menu.info', '정보') }}</q-item-label> -->
        
        <q-item to="/" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>{{ t('menu.home', 'Home') }}</q-item-section>
        </q-item>

        <!-- Dashboard link - only visible for authenticated users -->
        <q-item v-if="userStore.accessToken" to="/dashboard" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>{{ t('menu.dashboard', 'Dashboard') }}</q-item-section>
        </q-item>

        <q-item to="/about" exact clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>{{ t('menu.about', 'Introduction') }}</q-item-section>
        </q-item> 

        <!-- Rest of the menu items -->
        <template v-for="route in filteredRoutes">
          <template v-if="!['home', 'about'].includes(route.name)">
            <!-- Parent route with children -->
            <template v-if="route.children">
              <q-expansion-item
                :key="route.name"
                :label="formatRouteName(route.name)"
                :default-opened="isRouteExpanded(route)"
                :icon="route.meta?.icon || 'folder'"
              >
                <q-list>
                  <q-item
                    v-for="child in filterHiddenRoutes(route.children)"
                    :key="child.name"
                    :to="{ name: child.name }"
                    clickable
                    v-ripple
                  >
                    <q-item-section avatar>
                      <q-icon :name="child.meta?.icon || 'label'" />
                    </q-item-section>
                    <q-item-section>{{ formatRouteName(child.name) }}</q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>
            </template>
            
            <!-- Routes without children -->
            <q-item
              v-else
              :key="route.name"
              :to="{ name: route.name }"
              clickable
              v-ripple
            >
              <q-item-section avatar>
                <q-icon :name="route.meta?.icon || 'label'" />
              </q-item-section>
              <q-item-section>{{ formatRouteName(route.name) }}</q-item-section>
            </q-item>
          </template>
        </template>
      </q-list>
    </q-scroll-area>
    <!-- <div class="drawer-footer">Left Drawer Footer</div> -->
  </q-drawer>
</template>

<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {useLayoutStore} from '@/stores/modules/store_layout'
import {useUserStore} from '@/stores/modules/store_user'
import {storeToRefs} from 'pinia'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'

const { t } = useI18n()
const layoutStore = useLayoutStore()
const userStore = useUserStore()
const { drawerLeft } = storeToRefs(layoutStore)
const route = useRoute()
const router = useRouter()

// Filter out hidden routes
const filteredRoutes = computed(() => {
  return filterHiddenRoutes(router.options.routes)
})

// Updated helper function to filter hidden and role-based routes
function filterHiddenRoutes(routes) {
  return routes.filter(route => {
    // Filter out hidden routes
    if (route.hidden) return false
    
    // // Check parent route roles
    // if (route.meta?.roles && !route.meta.roles.includes(userStore.role)) return false
    
    // If route has children, check if at least one child is accessible
    if (route.children) {
      const accessibleChildren = route.children.filter(child => 
        !child.hidden && 
        (!child.meta?.roles || (userStore.user.accountRoles && 
          child.meta.roles.some(role => 
            userStore.user.accountRoles.some(ar => ar.roleType === role)
          )))
      )
      return accessibleChildren.length > 0
    }
    
    return true
  })
}

// Check if route should be expanded based on current route
function isRouteExpanded(parentRoute) {
  return route.path.startsWith(parentRoute.path)
}

// Format route name for display (e.g., "TeamWorkPlace" -> "Team Work Place")
function formatRouteName(name: string) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase())
}

onMounted(() => {
  console.log(drawerLeft)
})
</script>

<style scoped>
.q-item {
  padding-left: 1rem;
}

.q-expansion-item :deep(.q-list) {
  padding-left: 2rem;
}

.drawer-header {
  padding: 1rem;
  font-weight: 500;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

/* Add styling for section headers */
.q-item-label.header {
  padding: 8px 16px;
  font-size: 0.8rem;
  letter-spacing: .1em;
  color: rgba(0, 0, 0, 0.6);
}
</style> 