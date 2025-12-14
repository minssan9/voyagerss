<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          ✈️ Aviation Bot Admin
        </q-toolbar-title>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="refresh"
          @click="refreshData"
          :loading="loading"
        >
          <q-tooltip>새로고침</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-grey-1"
    >
      <q-list>
        <q-item-label header class="text-grey-8">
          메뉴
        </q-item-label>
        <q-item
          clickable
          v-ripple
          :active="$route.name === 'dashboard'"
          @click="$router.push({ name: 'dashboard' })"
        >
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>대시보드</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          :active="$route.name === 'topics'"
          @click="$router.push({ name: 'topics' })"
        >
          <q-item-section avatar>
            <q-icon name="topic" />
          </q-item-section>
          <q-item-section>
            <q-item-label>토픽 관리</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          :active="$route.name === 'weather'"
          @click="$router.push({ name: 'weather' })"
        >
          <q-item-section avatar>
            <q-icon name="cloud" />
          </q-item-section>
          <q-item-section>
            <q-item-label>날씨 관리</q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-ripple
          :active="$route.name === 'backups'"
          @click="$router.push({ name: 'backups' })"
        >
          <q-item-section avatar>
            <q-icon name="backup" />
          </q-item-section>
          <q-item-section>
            <q-item-label>백업 관리</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const leftDrawerOpen = ref(false);
const loading = ref(false);

function refreshData() {
  loading.value = true;
  // Reload current route
  router.go(0);
}
</script>

<style scoped lang="sass">
</style>




