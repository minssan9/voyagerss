<template>
  <div class="findash-layout">
    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Top Header -->
      <header class="top-header">
        <div class="header-left">
          <div class="header-title">
            <h2>{{ activeItem?.label }}</h2>
            <span class="header-path">/ {{ route.path }}</span>
          </div>
        </div>

        <div class="header-right">
          <div class="search-box">
            <q-icon name="search" />
            <input type="text" placeholder="Search assets..." />
          </div>
          <q-btn flat round dense class="notification-btn">
            <q-icon name="notifications" />
            <span class="notification-dot" />
          </q-btn>
          <div class="user-avatar">JD</div>
        </div>
      </header>

      <!-- Scrollable Page Content -->
      <main class="page-content">
        <div class="content-wrapper">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { path: '/findash', label: 'Overview', icon: 'dashboard' },
  { path: '/findash/assets', label: 'Asset DB', icon: 'storage' },
  { path: '/findash/portfolio', label: 'Holdings', icon: 'account_balance_wallet' },
  { path: '/findash/settings', label: 'System', icon: 'settings' },
];

const activeItem = computed(() => {
  return navItems.find(i => i.path === route.path) || navItems[0];
});
</script>

<style lang="scss" scoped>
@import '@/assets/sass/findash/variables';

.findash-layout {
  min-height: 100vh;
  background: $findash-slate-50;
  display: flex;
  font-family: system-ui, -apple-system, sans-serif;
  color: $findash-slate-900;
}

// Main Content
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

// Header
.top-header {
  height: 4rem;
  background: white;
  border-bottom: 1px solid $findash-slate-200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 20;
  position: sticky;
  top: 0;

  @media (min-width: 1024px) {
    padding: 0 2rem;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-title {
  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: $findash-slate-800;
    line-height: 1.2;
    margin: 0;
  }

  .header-path {
    font-size: 0.625rem;
    color: $findash-slate-400;
    font-weight: 500;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  display: none;
  align-items: center;
  background: rgba($findash-slate-100, 0.8);
  border: 1px solid rgba($findash-slate-200, 0.5);
  border-radius: 0.5rem;
  padding: 0.375rem 0.75rem;
  width: 16rem;
  transition: all 0.2s ease;

  &:focus-within {
    box-shadow: 0 0 0 2px rgba($findash-indigo, 0.2);
    border-color: rgba($findash-indigo, 0.3);
  }

  @media (min-width: 768px) {
    display: flex;
  }

  .q-icon {
    color: $findash-slate-400;
    font-size: 0.875rem;
  }

  input {
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    margin-left: 0.5rem;
    width: 100%;
    color: $findash-slate-700;

    &::placeholder {
      color: $findash-slate-400;
    }
  }
}

.notification-btn {
  color: $findash-slate-400;
  position: relative;

  &:hover {
    background: $findash-slate-50;
    color: $findash-slate-600;
  }

  .notification-dot {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 0.375rem;
    height: 0.375rem;
    background: $findash-rose;
    border-radius: 50%;
    box-shadow: 0 0 0 2px white;
  }
}

.user-avatar {
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  background: rgba($findash-indigo, 0.1);
  color: $findash-indigo;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba($findash-indigo, 0.2);
}

// Page Content
.page-content {
  flex: 1;
  overflow-y: auto;
  background: rgba($findash-slate-50, 0.5);
  padding: 1rem;
  scroll-behavior: smooth;

  @media (min-width: 1024px) {
    padding: 2rem;
  }
}

.content-wrapper {
  max-width: 80rem;
  margin: 0 auto;
}
</style>


