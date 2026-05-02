export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
}

const toasts = ref<Toast[]>([]);

export function useToast() {
  function show(message: string, type: ToastType = 'info', duration = 3500) {
    const id = crypto.randomUUID();
    toasts.value.push({ id, type, message });
    setTimeout(() => dismiss(id), duration);
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts: readonly(toasts),
    success: (msg: string) => show(msg, 'success'),
    error:   (msg: string) => show(msg, 'error'),
    info:    (msg: string) => show(msg, 'info'),
    dismiss,
  };
}
