import type { RefObject } from "preact";
import { useLayoutEffect, useState } from "preact/hooks";

export type ScrollAxis = "x" | "y";

export type ScrollEdges = {
  start: boolean;
  end: boolean;
};

const EDGE_THRESHOLD = 8;

const NO_EDGES: ScrollEdges = { start: false, end: false };

function readScrollEdges(element: HTMLElement, axis: ScrollAxis): ScrollEdges {
  const [offset, max] =
    axis === "x"
      ? [element.scrollLeft, element.scrollWidth - element.clientWidth]
      : [element.scrollTop, element.scrollHeight - element.clientHeight];

  if (max <= EDGE_THRESHOLD) {
    return NO_EDGES;
  }
  return {
    start: offset > EDGE_THRESHOLD,
    end: offset < max - EDGE_THRESHOLD,
  };
}

export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  axis: ScrollAxis = "y",
  refreshKey?: unknown,
): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NO_EDGES);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const next = readScrollEdges(element, axis);
      setEdges((current) =>
        current.start === next.start && current.end === next.end ? current : next,
      );
    };

    const resizeObserver = new ResizeObserver(update);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(element);
      for (const child of element.children) {
        resizeObserver.observe(child);
      }
    };

    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      update();
    });

    observeChildren();
    mutationObserver.observe(element, { childList: true, subtree: true });
    element.addEventListener("scroll", update, { passive: true });
    element.addEventListener("input", update);
    update();

    return () => {
      element.removeEventListener("scroll", update);
      element.removeEventListener("input", update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [axis, ref, refreshKey]);

  return edges;
}
