<template>
  <div class="log-viewer">
    <div class="log-header row items-center q-px-md q-py-xs">
      <q-icon name="terminal" size="xs" class="q-mr-xs" />
      <span class="text-caption">Job #{{ jobId }}</span>
      <q-space />
      <q-badge
        :color="connected ? 'positive' : 'grey'"
        :label="connected ? 'LIVE' : 'OFFLINE'"
      />
    </div>
    <div class="log-body" ref="logBody">
      <div v-for="(line, i) in logs" :key="i" class="log-line">
        <span class="log-prefix">{{ String(i + 1).padStart(4, ' ') }} </span>{{ line }}
      </div>
      <div v-if="!logs.length" class="text-grey q-pa-md">Waiting for output…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useJobStream } from '@/composables/autodev/useJobStream';

const props = defineProps<{
  jobId: number;
  token?: string;
  autoConnect?: boolean;
}>();

const logBody = ref<HTMLElement | null>(null);
const { logs, connected, connect, disconnect } = useJobStream(props.jobId, props.token);

if (props.autoConnect) connect();

watch(logs, async () => {
  await nextTick();
  if (logBody.value) logBody.value.scrollTop = logBody.value.scrollHeight;
}, { deep: true });

defineExpose({ connect, disconnect });
</script>

<style scoped>
.log-viewer {
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'SF Mono', Menlo, 'Courier New', monospace;
  font-size: 12px;
}
.log-header { background: #111; color: #aaa; }
.log-body {
  padding: 12px;
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
  color: #e0e0e0;
}
.log-line { line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
.log-prefix { color: #555; user-select: none; }
</style>
