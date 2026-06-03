<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

interface BadgeStyle {
  color: string;
  textColor: string;
}

const map: Record<string, BadgeStyle> = {
  NEW:        { color: 'grey-4', textColor: 'grey-8' },
  TRIAGED:    { color: 'blue-2', textColor: 'blue-9' },
  QUEUED:     { color: 'purple-2', textColor: 'purple-9' },
  PLAN_READY: { color: 'indigo-2', textColor: 'indigo-9' },
  BUILDING:   { color: 'orange-2', textColor: 'orange-9' },
  PR_OPEN:    { color: 'cyan-2', textColor: 'cyan-9' },
  MERGED:     { color: 'green-2', textColor: 'green-9' },
  CLOSED:     { color: 'grey-4', textColor: 'grey-8' },
  FAILED:     { color: 'red-2', textColor: 'red-9' },
};

const badgeStyle = computed(() => map[props.status] ?? { color: 'grey-3', textColor: 'grey-7' });
</script>

<template>
  <q-badge
    :color="badgeStyle.color"
    :text-color="badgeStyle.textColor"
    class="q-px-sm q-py-xs text-weight-bold"
  >
    {{ status }}
  </q-badge>
</template>
