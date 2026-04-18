import { ref, onUnmounted } from 'vue';

export function useJobStream(jobId: number, token?: string) {
  const logs = ref<string[]>([]);
  const connected = ref(false);
  let source: EventSource | null = null;

  function connect(): void {
    const base = `${import.meta.env.VITE_API_URL}/autodev/jobs/${jobId}/stream`;
    const url = token ? `${base}?token=${token}` : base;
    source = new EventSource(url);

    source.addEventListener('log', (e: MessageEvent) => {
      logs.value.push(e.data);
    });

    source.onopen = () => { connected.value = true; };
    source.onerror = () => { connected.value = false; };
  }

  function disconnect(): void {
    if (source) {
      source.close();
      source = null;
      connected.value = false;
    }
  }

  onUnmounted(disconnect);

  return { logs, connected, connect, disconnect };
}
