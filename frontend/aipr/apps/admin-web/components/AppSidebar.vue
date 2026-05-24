<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const auth   = useAuthStore();
const router = useRouter();
const route  = useRoute();

const nav = [
  { label: 'Issues',   icon: '◈', to: '/issues'  },
  { label: 'Settings', icon: '⚙', to: '/settings' },
];

function isActive(to: string) { return route.path.startsWith(to); }

async function logout() {
  auth.logout();
  await router.push('/login');
}
</script>

<template>
  <aside class="fixed top-0 left-0 h-screen w-60 bg-white border-r border-border
                flex flex-col z-50 select-none">
    <!-- Logo -->
    <div class="px-6 py-5 border-b border-border">
      <span class="text-[15px] font-700 tracking-tight text-[#111]">Auto‑PR</span>
      <span class="ml-1 text-[11px] font-500 text-muted bg-surface px-1.5 py-0.5 rounded-md">Admin</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-3 py-4 flex flex-col gap-1">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
               transition-colors duration-150 cursor-pointer"
        :class="isActive(item.to)
          ? 'bg-accent/10 text-accent'
          : 'text-muted hover:bg-surface hover:text-[#111]'"
      >
        <span class="text-base leading-none">{{ item.icon }}</span>
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- User -->
    <div class="px-4 py-4 border-t border-border">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center
                    text-accent text-xs font-600">
          {{ (auth.admin?.email ?? 'A').charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-500 truncate text-[#111]">{{ auth.admin?.email ?? 'Admin' }}</p>
          <p class="text-[11px] text-muted">{{ auth.admin?.role ?? '' }}</p>
        </div>
        <button
          class="btn btn-ghost p-1.5 text-muted hover:text-[#ff3b30]"
          title="Logout"
          @click="logout"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6"
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
