<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';

const props = defineProps<{
  issueId: string;
  runId:   string | null;
}>();

interface LogLine {
  id: string;
  stream: 'stdout' | 'stderr' | 'event';
  content: string;
  ts: string;
}

const lines = ref<LogLine[]>([]);
const scrollContainer = ref<HTMLDivElement>();
let es: EventSource | null = null;

function connect() {
  lines.value = [];
  if (!props.runId) return;
  if (es) {
    es.close();
  }

  // Points to Vite dev proxy target (baseURL was /api/aipr, which routes to localhost:9002/api/aipr/admin/issues...)
  // Since Vite proxies `/api` to the backend, we can access:
  const url = `/api/aipr/admin/issues/${props.issueId}/logs?runId=${props.runId}`;
  
  es = new EventSource(url);
  es.addEventListener('log', (e) => {
    try {
      const data = JSON.parse(e.data) as LogLine;
      lines.value.push(data);
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
        }
      });
    } catch (err) { /* ignore */ }
  });

  es.addEventListener('done', () => es?.close());
}

watch(() => props.runId, connect, { immediate: true });
onUnmounted(() => es?.close());

const streamColor = {
  stdout: 'text-[#e5e5e7]',
  stderr: 'text-[#ff9f0a]',
  event: 'text-[#30d158]'
};
</script>

<template>
  <div
    ref="scrollContainer"
    class="bg-[#111] rounded-xl p-4 font-mono text-[12px] leading-relaxed
           overflow-y-auto max-h-80 text-[#e5e5e7]"
    role="log"
    aria-live="polite"
    aria-label="Run log timeline"
  >
    <div v-if="!runId" class="text-grey-6 italic">No active run.</div>
    <div v-else-if="lines.length === 0" class="text-grey-6 italic animate-pulse">
      Waiting for output…
    </div>
    <div
      v-for="line in lines"
      :key="line.id"
      :class="streamColor[line.stream] || 'text-[#e5e5e7]'"
    >
      <span class="opacity-40 mr-2 text-[10px]">
        {{ new Date(line.ts).toLocaleTimeString() }}
      </span>{{ line.content }}
    </div>
  </div>
</template>

<style scoped>
.rounded-xl {
  border-radius: 12px;
}
.max-h-80 {
  max-height: 320px;
}
/* custom dark colors */
.text-\[\#e5e5e7\] {
  color: #e5e5e7;
}
.text-\[\#ff9f0a\] {
  color: #ff9f0a;
}
.text-\[\#30d158\] {
  color: #30d158;
}
</style>
