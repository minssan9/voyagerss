<script setup lang="ts">
const props = defineProps<{ status: string }>();

const map: Record<string, string> = {
  NEW:        'bg-[#e5e5e7] text-[#6e6e73]',
  TRIAGED:    'bg-blue-100 text-blue-700',
  QUEUED:     'bg-purple-100 text-purple-700',
  PLAN_READY: 'bg-indigo-100 text-indigo-700',
  BUILDING:   'bg-amber-100 text-amber-700',
  PR_OPEN:    'bg-cyan-100 text-cyan-700',
  MERGED:     'bg-green-100 text-green-700',
  CLOSED:     'bg-[#e5e5e7] text-[#6e6e73]',
  FAILED:     'bg-red-100 text-red-600',
};

const cls = computed(() => map[props.status] ?? 'bg-gray-100 text-gray-600');
</script>

<template>
  <span class="badge" :class="cls">{{ status }}</span>
</template>
