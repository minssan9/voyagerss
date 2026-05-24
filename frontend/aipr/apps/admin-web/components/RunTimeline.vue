<script setup lang="ts">
const props = defineProps<{
  issueId: string;
  runId:   string | null;
}>();

interface LogLine { id: string; stream: 'stdout' | 'stderr' | 'event'; content: string; ts: string; }

const config = useRuntimeConfig();
const lines  = ref<LogLine[]>([]);
const el     = ref<HTMLDivElement>();
let   es: EventSource | null = null;

function connect() {
  if (!props.runId) return;
  es?.close();
  const url = `${config.public.apiUrl}/api/admin/issues/${props.issueId}/logs?runId=${props.runId}`;
  es = new EventSource(url);
  es.addEventListener('log', (e) => {
    const data = JSON.parse(e.data) as LogLine;
    lines.value.push(data);
    nextTick(() => el.value?.scrollTo({ top: el.value.scrollHeight, behavior: 'smooth' }));
  });
  es.addEventListener('done', () => es?.close());
}

watch(() => props.runId, connect, { immediate: true });
onUnmounted(() => es?.close());

const streamColor = { stdout: 'text-[#e5e5e7]', stderr: 'text-[#ff9f0a]', event: 'text-[#30d158]' };
</script>

<template>
  <div
    ref="el"
    class="bg-[#111] rounded-xl p-4 font-mono text-[12px] leading-relaxed
           overflow-y-auto max-h-80 text-[#e5e5e7]"
    role="log"
    aria-live="polite"
    aria-label="Run log timeline"
  >
    <div v-if="!runId" class="text-muted italic">No active run.</div>
    <div v-else-if="lines.length === 0" class="text-muted italic animate-pulse">
      Waiting for output…
    </div>
    <div
      v-for="line in lines"
      :key="line.id"
      :class="streamColor[line.stream]"
    >
      <span class="opacity-40 mr-2 text-[10px]">
        {{ new Date(line.ts).toLocaleTimeString() }}
      </span>{{ line.content }}
    </div>
  </div>
</template>
