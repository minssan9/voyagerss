export type WidgetMessage =
  | { type: 'ready' }
  | { type: 'resize'; payload: { height: number } }
  | { type: 'close' }
  | { type: 'submitted'; payload: { issueId: string } };

export function usePostMessage() {
  function send(msg: WidgetMessage) {
    if (typeof window === 'undefined') return;
    window.parent.postMessage(msg, '*');
  }

  function onMessage(cb: (msg: MessageEvent) => void) {
    if (typeof window === 'undefined') return;
    window.addEventListener('message', cb);
    onUnmounted(() => window.removeEventListener('message', cb));
  }

  return { send, onMessage };
}
