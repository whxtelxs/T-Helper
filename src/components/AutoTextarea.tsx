import { useLayoutEffect, useRef } from "preact/hooks";

type AutoTextareaProps = {
  id: string;
  value: string;
  class?: string;
  onInput: (value: string) => void;
};

export function AutoTextarea({
  id,
  value,
  class: className,
  onInput,
}: AutoTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const resize = () => {
      element.style.height = "auto";
      const contentHeight = element.scrollHeight;
      const maxHeight = Number.parseFloat(getComputedStyle(element).maxHeight);
      element.style.height = `${contentHeight}px`;
      element.style.overflowY =
        Number.isFinite(maxHeight) && contentHeight > maxHeight ? "auto" : "hidden";
    };
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width !== element.clientWidth) {
        width = element.clientWidth;
        resize();
      }
    });
    observer.observe(element);
    resize();
    return () => observer.disconnect();
  }, [value]);

  return (
    <textarea
      ref={ref}
      id={id}
      class={className}
      value={value}
      rows={1}
      onInput={(event) => onInput(event.currentTarget.value)}
    />
  );
}
