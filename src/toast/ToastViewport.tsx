import { useSyncExternalStore } from "preact/compat";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "../lib/motion";
import { dismissToast, getToasts, subscribeToasts } from "./store";
import { ToastIcon } from "./ToastIcon";
import "./toast.css";

export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  const reduceMotion = useReducedMotion();

  return (
    <div class="toast-viewport" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            class={`toast toast--${item.kind}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={() => dismissToast(item.id)}
          >
            <span class="toast-icon">
              <ToastIcon kind={item.kind} />
            </span>
            <span class="toast-message">{item.message}</span>
            <span
              class="toast-progress"
              style={{ animationDuration: `${item.duration}ms` }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
