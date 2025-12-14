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
    <q-layout view="hHh LpR fFf" container
              style="height: 100vh"
              class="shadow-2 rounded-borders">
      <MainHeader />
      <LeftDrawer />
      <RightDrawer />
      <q-page-container style="padding-bottom: 10px;">
        <q-page padding>
          <slot></slot>
        </q-page>
      </q-page-container>
      <Footer />
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainHeader from './components/MainHeader.vue'
import LeftDrawer from './components/LeftDrawer.vue'
import RightDrawer from './components/RightDrawer.vue'
import Footer from './components/Footer.vue'
import { useLayoutStore } from '@/stores/modules/store_layout'
import { useUserStore } from '@/stores/modules/store_user'
import { useTeamStore } from '@/stores/modules/store_team'
import * as ChannelService from '@channel.io/channel-web-sdk-loader'
import Cookies from 'js-cookie'
const layoutStore = useLayoutStore()
const userStore = useUserStore()
const teamStore = useTeamStore()
const notifications = ref([])

onMounted(() => {
  layoutStore.resetDrawers()
  if (Cookies.get('accessToken')) {
    userStore.fetchUser()
    // teamStore.
  }


  
  ChannelService.loadScript()
  ChannelService.boot({
    "pluginKey": import.meta.env.VITE_CHANNEL_TALK_PLUGIN_KEY
  })
})
</script>

<style lang="scss">
@import "@/assets/styles/index.scss";

.drawer-side {
  height: calc(100vh - 200px);
}
</style>
