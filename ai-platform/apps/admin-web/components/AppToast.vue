<script setup lang="ts">
const { toasts, dismiss } = useToast();

const iconMap = { success: '✓', error: '✕', info: 'ℹ' };
const colorMap = {
  success: 'bg-[#30d158] text-white',
  error:   'bg-[#ff3b30] text-white',
  info:    'bg-[#111] text-white',
};
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
                 text-sm font-medium pointer-events-auto cursor-pointer min-w-[240px] max-w-[360px]"
          :class="colorMap[t.type]"
          @click="dismiss(t.id)"
        >
          <span class="text-base">{{ iconMap[t.type] }}</span>
          <span class="flex-1">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from  { opacity: 0; transform: translateY(12px); }
.toast-leave-to    { opacity: 0; transform: translateX(20px); }
</style>
