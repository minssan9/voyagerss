<template>
  <q-badge :color="color" :label="status" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

const color = computed(() => {
  const map: Record<string, string> = {
    OPEN: 'blue',
    IN_PROGRESS: 'orange',
    MERGED: 'purple',
    DONE: 'positive',
    REOPENED: 'warning',
    CANCELLED: 'grey',
    PENDING: 'grey',
    RUNNING: 'orange',
    SUCCESS: 'positive',
    FAILED: 'negative',
  };
  return map[props.status] ?? 'grey';
});
</script>
