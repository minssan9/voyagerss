<template>
  <div v-if="isVisible(item)">
    <!-- Case 1: No children or only one child that isn't always shown -> Render as Single Item -->
    <template
      v-if="hasOneShowingChild(item.children, item) && (!onlyOneChild.children || onlyOneChild.noShowingChildren) && !item.alwaysShow">
      <q-item v-if="onlyOneChild.meta" clickable v-ripple :active="isRouteActive(resolvePath(onlyOneChild.path))"
        @click="navigateTo(resolvePath(onlyOneChild.path))" :class="['nav-item', { active: isRouteActive(resolvePath(onlyOneChild.path)) }]">
        <q-item-section avatar v-if="onlyOneChild.meta.icon || item.meta?.icon">
          <q-icon :name="onlyOneChild.meta.icon || item.meta?.icon" />
        </q-item-section>
        <q-item-section>
          {{ onlyOneChild.meta.title || formatRouteName(onlyOneChild.name) }}
        </q-item-section>
      </q-item>
    </template>

    <!-- Case 2: Has children -> Render as Expansion Item -->
    <q-expansion-item v-else :icon="item.meta?.icon" :label="item.meta?.title || formatRouteName(item.name)" :header-class="['nav-expansion-header']"
      :content-class="['nav-expansion-content']" :default-opened="hasActiveChild(item, basePath)">
      <sidebar-item v-for="child in item.children" :key="child.path" :is-nest="true" :item="child"
        :base-path="resolvePath(child.path)" class="nest-menu" />
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// Use a unique name for recursion
defineOptions({
  name: 'SidebarItem'
})

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isNest: {
    type: Boolean,
    default: false
  },
  basePath: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const route = useRoute()
const onlyOneChild = ref<any>(null)


// Helper to check if a route should be visible
function isVisible(item: any) {
  if (item.hidden) return false
  if (item.path === '' && item.redirect) return false
  // If no name and no title, likely a technical route wrapper without display intent (unless it has visible children)
  if (!item.name && (!item.meta || !item.meta.title) && (!item.children || item.children.length === 0)) return false
  return true
}

function hasOneShowingChild(children: any[] = [], parent: any) {
  const showingChildren = children.filter((item: any) => {
    return isVisible(item)
  })

  // When there is only one child router, the child router is displayed by default
  if (showingChildren.length === 1) {
    onlyOneChild.value = showingChildren[0]
    return true
  }

  // Show parent if there are no child router to display
  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: '', noShowingChildren: true }
    return true
  }

  return false
}

function resolvePath(routePath: string) {
  if (isExternal(routePath)) {
    return routePath
  }
  if (isExternal(props.basePath)) {
    return props.basePath
  }

  // Handle absolute paths
  if (routePath.startsWith('/')) {
    return routePath
  }
  
  // Simple path join
  const basePath = props.basePath.endsWith('/') ? props.basePath : props.basePath + '/'
  const path = routePath
  return (basePath + path).replace(/\/+/g, '/') // Dedupe slashes
}

function isExternal(path: string) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

function isRouteActive(path: string) {
  // Exact match or sub-path match
  return route.path === path || (route.path.startsWith(path) && route.path[path.length] === '/')
}


function navigateTo(path: string) {
  if (isExternal(path)) {
    window.location.href = path
  } else {
    router.push(path).catch(err => {
        if (err.name !== 'NavigationDuplicated') console.error(err)
    })
  }
}

function hasActiveChild(item: any, currentBasePath: string) {
  // We need to know the full path of this item to check if it's active.
  // In the template scope, resolvePath(item.path) gives the full path of 'item'.
  const fullPath = resolvePath(item.path)
  
  // If the current route starts with this item's path, it should be open.
  if (route.path.startsWith(fullPath)) {
    return true
  }
  return false
}


function formatRouteName(name: string | undefined | null) {
  if (!name) return ''
  return String(name)
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/^./, str => str.toUpperCase())
}
</script>


