import { ref, onUnmounted } from 'vue';

export function useWebSocket(url: string) {
  const messages = ref<unknown[]>([]);
  const connected = ref(false);
  let ws: WebSocket | null = null;

  function connect(): void {
    ws = new WebSocket(url);
    ws.onopen = () => { connected.value = true; };
    ws.onclose = () => { connected.value = false; };
    ws.onmessage = (e: MessageEvent) => {
      try {
        messages.value.push(JSON.parse(e.data as string));
      } catch {
        messages.value.push(e.data);
      }
    };
  }

  function disconnect(): void {
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  onUnmounted(disconnect);

  return { messages, connected, connect, disconnect };
}
