import type { RefObject } from "preact";
import { useLayoutEffect } from "preact/hooks";

const containers: HTMLElement[] = [];
let previousInert = false;

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, input:not([type="hidden"]), textarea, select, a[href], [tabindex]',
    ),
  ).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest("[hidden], [inert]") &&
      element.getClientRects().length > 0,
  );
}

export function useModalFocus(enabled: boolean, ref: RefObject<HTMLDivElement>): void {
  useLayoutEffect(() => {
    const container = ref.current;
    if (!enabled || !container) return;
    const previousFocus = document.activeElement;
    const app = document.getElementById("root");
    if (containers.length === 0 && app) {
      previousInert = app.inert;
      app.inert = true;
    }
    containers.push(container);
    const focusFirst = () => {
      (focusableElements(container)[0] ?? container).focus({ preventScroll: true });
    };
    focusFirst();
    const isTop = () => containers.at(-1) === container;
    const onFocus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !container.contains(event.target))
        focusFirst();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!isTop() || event.key !== "Tab") return;
      const elements = focusableElements(container);
      const first = elements[0] ?? container;
      const last = elements.at(-1) ?? container;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === container)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === container)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("keydown", onKey);
    return () => {
      const wasTop = isTop();
      containers.splice(containers.indexOf(container), 1);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("keydown", onKey);
      if (containers.length === 0 && app) app.inert = previousInert;
      if (wasTop && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [enabled, ref]);
}
