import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef } from "preact/hooks";

const escapeHandlers: (() => void)[] = [];

function dismissTopmost(event: KeyboardEvent): void {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const dismiss = escapeHandlers.at(-1);
  if (dismiss) {
    event.preventDefault();
    dismiss();
  }
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function useEscapeKey(enabled: boolean, onEscape: () => void): void {
  const handler = useLatest(onEscape);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    const dismiss = () => handler.current();
    if (escapeHandlers.length === 0) document.addEventListener("keydown", dismissTopmost);
    escapeHandlers.push(dismiss);
    return () => {
      escapeHandlers.splice(escapeHandlers.indexOf(dismiss), 1);
      if (escapeHandlers.length === 0)
        document.removeEventListener("keydown", dismissTopmost);
    };
  }, [enabled, handler]);
}

export function useDismiss(
  enabled: boolean,
  onDismiss: () => void,
  inside?: RefObject<HTMLElement | null>,
): void {
  const handler = useLatest(onDismiss);

  useEscapeKey(enabled, onDismiss);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && inside?.current?.contains(target)) {
        return;
      }
      handler.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [enabled, handler, inside]);
}
