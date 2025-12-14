<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          🇰🇷 investand
        </q-toolbar-title>

        <div>
          <q-btn
            flat
            dense
            round
            icon="menu"
            aria-label="Menu"
            @click="toggleLeftDrawer"
          />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <q-item clickable v-ripple to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/history">
          <q-item-section avatar>
            <q-icon name="trending_up" />
          </q-item-section>
          <q-item-section>
            <q-item-label>History</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/statistics">
          <q-item-section avatar>
            <q-icon name="analytics" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Statistics</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable v-ripple to="/dart-data">
          <q-item-section avatar>
            <q-icon name="business" />
          </q-item-section>
          <q-item-section>
            <q-item-label>DART Data</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator />

        <q-item-label header>
          About
        </q-item-label>

        <q-item clickable v-ripple to="/about">
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section>
            <q-item-label>About Project</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Google AdSense 영역 -->
    <q-footer elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title class="text-center">
          <div class="ad-placeholder">
            📢 Google AdSense 광고 영역 (구현 예정)
          </div>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>

<style lang="scss" scoped>
.ad-placeholder {
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
  color: #ccc;
}
</style> 