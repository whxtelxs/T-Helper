import type { ComponentChildren, RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { useScrollEdges, type ScrollAxis } from "../hooks/useScrollEdges";
import "./ScrollFade.css";

type ScrollFadeProps = {
  children: ComponentChildren;
  class?: string;
  axis?: ScrollAxis;
  bodyRef?: RefObject<HTMLDivElement>;
  refreshKey?: unknown;
};

const EDGE_CLASSES = {
  y: { start: "scroll-fade--top", end: "scroll-fade--bottom" },
  x: { start: "scroll-fade--left", end: "scroll-fade--right" },
} as const;

export function ScrollFade({
  children,
  class: extraClass,
  axis = "y",
  bodyRef,
  refreshKey,
}: ScrollFadeProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const scrollRef = bodyRef ?? localRef;
  const edges = useScrollEdges(scrollRef, axis, refreshKey);

  useEffect(() => {
    const element = scrollRef.current;
    if (axis !== "x" || !element) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        return;
      }
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const max = element.scrollWidth - element.clientWidth;
      const next = Math.min(max, Math.max(0, element.scrollLeft + delta));
      if (max <= 1 || next === element.scrollLeft) {
        return;
      }
      event.preventDefault();
      element.scrollLeft = next;
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [axis, scrollRef]);

  const className = [
    "scroll-fade",
    `scroll-fade--${axis}`,
    edges.start && EDGE_CLASSES[axis].start,
    edges.end && EDGE_CLASSES[axis].end,
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div class={className}>
      <div ref={scrollRef} class="scroll-fade__body hide-scrollbar">
        {children}
      </div>
    </div>
  );
}
