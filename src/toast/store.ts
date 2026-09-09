export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  kind: ToastKind;
  duration: number;
};

const DEFAULT_DURATION = 2400;
const MAX_VISIBLE = 3;

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, number>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function getToasts(): Toast[] {
  return toasts;
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  if (!toasts.some((item) => item.id === id)) {
    return;
  }
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function push(message: string, kind: ToastKind, duration = DEFAULT_DURATION) {
  const id = crypto.randomUUID();
  toasts = [...toasts.slice(1 - MAX_VISIBLE), { id, message, kind, duration }];
  timers.set(
    id,
    window.setTimeout(() => dismissToast(id), duration),
  );
  emit();
}

export const toast = {
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
  info: (message: string) => push(message, "info"),
};
