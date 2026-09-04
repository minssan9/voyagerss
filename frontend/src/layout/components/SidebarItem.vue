<template>
  <div v-if="isVisible(item)">
    <!-- Case 1: Single item (no children or one child) -->
    <template
      v-if="hasOneShowingChild(item.children, item) && (!onlyOneChild.children || onlyOneChild.noShowingChildren) && !item.alwaysShow">
      <q-item
        v-if="onlyOneChild.meta"
        clickable
        v-ripple
        :active="isRouteActive(resolvePath(onlyOneChild.path))"
        @click="navigateTo(resolvePath(onlyOneChild.path))"
        :class="['nav-item', { 'nav-item--active': isRouteActive(resolvePath(onlyOneChild.path)) }]"
      >
        <q-item-section avatar v-if="onlyOneChild.meta.icon || item.meta?.icon">
          <q-icon :name="onlyOneChild.meta.icon || item.meta?.icon" size="18px" />
        </q-item-section>
        <q-item-section>
          {{ onlyOneChild.meta.title || formatRouteName(onlyOneChild.name) }}
        </q-item-section>
      </q-item>
    </template>

    <!-- Case 2: Expansion item (multiple children) -->
    <q-expansion-item
      v-else
      :icon="item.meta?.icon"
      :label="item.meta?.title || formatRouteName(item.name)"
      header-class="nav-expansion-header"
      :default-opened="hasActiveChild(item, basePath)"
    >
      <sidebar-item
        v-for="child in item.children"
        :key="child.path"
        :is-nest="true"
        :item="child"
        :base-path="resolvePath(child.path)"
        class="nest-menu"
      />
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

defineOptions({ name: 'SidebarItem' })

const props = defineProps({
  item:     { type: Object,  required: true },
  isNest:   { type: Boolean, default: false },
  basePath: { type: String,  default: '' }
})

const router = useRouter()
const route  = useRoute()
const onlyOneChild = ref<any>(null)

function isVisible(item: any) {
  if (item.hidden || item.meta?.hidden) return false
  if (item.path === '' && item.redirect) return false
  if (!item.name && (!item.meta?.title) && (!item.children?.length)) return false
  return true
}

function hasOneShowingChild(children: any[] = [], parent: any) {
  const showing = children.filter(isVisible)
  if (showing.length === 1) {
    onlyOneChild.value = showing[0]
    return true
  }
  if (showing.length === 0) {
    onlyOneChild.value = { ...parent, path: '', noShowingChildren: true }
    return true
  }
  return false
}

function resolvePath(routePath: string) {
  if (isExternal(routePath) || isExternal(props.basePath)) return routePath || props.basePath
  if (routePath.startsWith('/')) return routePath
  const base = props.basePath.endsWith('/') ? props.basePath : props.basePath + '/'
  return (base + routePath).replace(/\/+/g, '/')
}

function isExternal(path: string) {
  return /^(https?:|mailto:|tel:)/.test(path)
}

function isRouteActive(path: string) {
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
  return route.path.startsWith(resolvePath(item.path))
}

function formatRouteName(name: string | undefined | null) {
  if (!name) return ''
  return String(name).replace(/([A-Z])/g, ' $1').trim().replace(/^./, s => s.toUpperCase())
}
</script>

<style scoped lang="scss">
.nav-item {
  margin: 2px 8px;
  border-radius: var(--voy-radius-sm, 8px);
  color: var(--voy-sidebar-text, #d1d5db);
  font-size: 13.5px;
  font-weight: 400;
  min-height: 38px;
  transition: background var(--voy-transition-fast, 150ms), color var(--voy-transition-fast, 150ms);

  :deep(.q-icon) {
    color: rgba(255, 255, 255, 0.4);
    transition: color var(--voy-transition-fast, 150ms);
  }

  :deep(.q-item__section--avatar) {
    min-width: 36px;
    padding-right: 4px;
  }

  &:hover {
    background: var(--voy-sidebar-hover-bg, rgba(255,255,255,0.06));
    color: #f3f4f6;

    :deep(.q-icon) {
      color: rgba(255, 255, 255, 0.75);
    }
  }

  &--active {
    background: var(--voy-sidebar-active-bg, rgba(77,110,252,0.15));
    color: var(--voy-sidebar-active-text, #7da0ff);
    font-weight: 500;

    :deep(.q-icon) {
      color: var(--voy-sidebar-active-text, #7da0ff);
    }
  }
}

// Nested items have extra left indent
.nest-menu .nav-item {
  margin-left: 20px;
  font-size: 13px;
}
</style>
