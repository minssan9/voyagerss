<template>
  <div>
    <div class="background-pattern"></div>
    <div>
      <ul>
        <li v-for="(notification, index) in notifications" :key="index">
          {{ notification }}
        </li>
      </ul>
    </div>
    <q-layout
      view="hHh LpR fFf"
      container
      style="height: 100vh"
      :class="layoutClasses"
    >
      <MainHeader />
      <LeftDrawer v-if="!userStore.isWorker" />
      <RightDrawer />
      <q-page-container style="padding-bottom: 10px;">
        <q-page>
          <slot></slot>
        </q-page>
      </q-page-container>
      <WorkerBottomNav v-if="userStore.isWorker" />
      <FeedbackFloatingButton v-if="userStore.user.accountId && !userStore.isWorker" />
      <Footer v-if="!userStore.isWorker" />
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import MainHeader from './components/MainHeader.vue'
import LeftDrawer from './components/LeftDrawer.vue'
import RightDrawer from './components/RightDrawer.vue'
import Footer from './components/Footer.vue'
import WorkerBottomNav from './components/WorkerBottomNav.vue'
import FeedbackFloatingButton from '@/components/feedback/FeedbackFloatingButton.vue'
import { useLayoutStore } from '@/stores/common/store_layout'
import { useUserStore } from '@/stores/common/store_user'
import { useTeamStore } from '@/modules/workschd/store/store_team'
import Cookies from 'js-cookie'

const layoutStore = useLayoutStore()
const userStore = useUserStore()
const teamStore = useTeamStore()
const route = useRoute()
const notifications = ref([])

const isMobileLayout = computed(() => {
  for (let i = route.matched.length - 1; i >= 0; i--) {
    if (route.matched[i].meta?.mobile) return true
  }
  const path = route.path.replace(/\/$/, '')
  return path.startsWith('/workschd/m/') || path === '/workschd/admin/tasks/mobile'
})

const layoutClasses = computed(() => [
  'shadow-2 rounded-borders',
  {
    'layout-worker': userStore.isWorker,
    'layout-mobile': isMobileLayout.value,
  },
])

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

function onKeydown(event: KeyboardEvent) {
  if (userStore.isWorker) return
  if (event.key !== 'F4') return
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  if (isEditableTarget(event.target)) return
  event.preventDefault()
  layoutStore.toggleLeftDrawer()
}

onMounted(() => {
  layoutStore.resetDrawers()
  if (Cookies.get('accessToken')) {
    userStore.fetchUser()
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>
