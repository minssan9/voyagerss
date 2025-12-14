<template>
  <q-header elevated :class="$q.dark.isActive ? 'bg-secondary' : 'bg-black'">
    <q-toolbar>
      <q-btn flat @click="layoutStore.toggleLeftDrawer()" round dense icon="menu" />
      <q-toolbar-title>
        <router-link 
          :to="{ name: 'home' }" 
          class="text-white text-decoration-none"
        >
          {{ layoutStore.title }}
        </router-link>
      </q-toolbar-title>
      <q-btn flat @click="layoutStore.toggleRightDrawer()" round dense icon="menu" />
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'
import { useLayoutStore } from '@/stores/modules/store_layout'
import {onMounted} from "vue";

const $q = useQuasar()
const layoutStore = useLayoutStore()

onMounted(() => {

})
</script> 