<template>
  <q-card flat bordered class="issue-card q-mb-sm">
    <q-card-section>
      <div class="row items-center justify-between">
        <div>
          <div class="text-caption text-grey">{{ issue.source }} · {{ issue.issueKey }}</div>
          <div class="text-subtitle1 text-weight-medium q-mt-xs">{{ issue.summary }}</div>
        </div>
        <StatusBadge :status="issue.status" />
      </div>
    </q-card-section>
    <q-card-actions>
      <q-btn flat dense size="sm" label="Trigger" icon="play_arrow"
        :loading="triggering" @click="$emit('trigger', issue.issueKey)" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import StatusBadge from './StatusBadge.vue';
import type { Issue } from '@/api/autodev/api-autodev';

defineProps<{ issue: Issue; triggering?: boolean }>();
defineEmits<{ trigger: [issueKey: string] }>();
</script>

<style scoped>
.issue-card {
  background: #1a1a1a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  transition: border-color .2s;
}
.issue-card:hover { border-color: rgba(255,255,255,0.2); }
</style>
