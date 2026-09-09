import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useDismiss } from "../hooks/useDismiss";
import { POPOVER_MOTION } from "../lib/motion";
import "./ContextMenu.css";

const VIEWPORT_MARGIN = 8;

export type MenuAnchor = {
  x: number;
  y: number;
};

type ContextMenuProps = {
  anchor: MenuAnchor | null;
  onClose: () => void;
  children: ComponentChildren;
};

export function ContextMenu({ anchor, onClose, children }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useDismiss(anchor !== null, onClose, ref);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element) {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    }
    if (!anchor || !element) return;
    const previousFocus = document.activeElement;
    element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [anchor]);

  const clamp = (value: number, viewport: number, extent: number) =>
    Math.max(VIEWPORT_MARGIN, Math.min(value, viewport - extent - VIEWPORT_MARGIN));

  return createPortal(
    <AnimatePresence>
      {anchor ? (
        <motion.div
          ref={ref}
          class="context-menu"
          role="menu"
          aria-label="Действия"
          onKeyDown={(event) => {
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            );
            const current = items.findIndex((item) => item === document.activeElement);
            let next: number;
            if (event.key === "ArrowDown") next = (current + 1) % items.length;
            else if (event.key === "ArrowUp")
              next = (current - 1 + items.length) % items.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = items.length - 1;
            else if (event.key === "Tab") {
              onClose();
              return;
            } else return;
            event.preventDefault();
            items[next]?.focus();
          }}
          style={{
            left: clamp(anchor.x, window.innerWidth, size.width),
            top: clamp(anchor.y, window.innerHeight, size.height),
          }}
          onPointerDown={(event) => event.stopPropagation()}
          {...POPOVER_MOTION}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

type ContextMenuItemProps = {
  children: ComponentChildren;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function ContextMenuItem({
  children,
  onClick,
  danger = false,
  disabled = false,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      class={danger ? "context-item context-item--danger" : "context-item"}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
