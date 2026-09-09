import { useContext, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { AnimatePresence, motion } from "motion/react";
import { useDismiss } from "../hooks/useDismiss";
import { POPOVER_MOTION } from "../lib/motion";
import { ScrollFade } from "./ScrollFade";
import { OverlayHost } from "./OverlayHost";
import "./CategoryField.css";

type CategoryFieldProps = {
  id: string;
  value: string;
  categories: readonly string[];
  onChange: (value: string) => void;
};

export function CategoryField({ id, value, categories, onChange }: CategoryFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayHost = useContext(OverlayHost);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    "--suggest-height": "180px",
  });

  const query = value.trim().toLowerCase();
  const suggestions = categories.filter((name) => name.toLowerCase().includes(query));

  useDismiss(open, () => setOpen(false), wrapRef);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const updatePosition = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const below = window.innerHeight - rect.bottom - 14;
        const above = rect.top - 14;
        const height = Math.max(0, Math.min(180, Math.max(above, below)));
        const width = Math.min(rect.width, window.innerWidth - 16);
        setPosition({
          top: below >= height ? rect.bottom + 6 : Math.max(8, rect.top - height - 6),
          left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
          width,
          "--suggest-height": `${height}px`,
        });
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (open && active >= 0) {
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active, id]);

  return (
    <div class="modal-field">
      <label for={id}>Категория</label>
      <div ref={wrapRef} class="category-combo">
        <input
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={`${id}-suggestions`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && active >= 0 ? `${id}-option-${active}` : undefined
          }
          placeholder="Выбрать или создать"
          value={value}
          onFocus={() => setOpen(true)}
          onInput={(event) => {
            setActive(-1);
            onChange(event.currentTarget.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              suggestions.length
            ) {
              event.preventDefault();
              setOpen(true);
              setActive(
                (current) =>
                  (current +
                    (event.key === "ArrowDown" ? 1 : suggestions.length - 1) +
                    suggestions.length) %
                  suggestions.length,
              );
            } else if (event.key === "Enter" && open && active >= 0) {
              const suggestion = suggestions[active];
              if (suggestion !== undefined) {
                event.preventDefault();
                onChange(suggestion);
                setOpen(false);
              }
            } else if (event.key === "Tab") setOpen(false);
          }}
        />
      </div>
      {createPortal(
        <AnimatePresence>
          {open && suggestions.length > 0 ? (
            <motion.div
              id={`${id}-suggestions`}
              role="listbox"
              aria-label="Категории"
              class="category-suggest"
              style={position}
              onPointerDown={(event) => event.stopPropagation()}
              {...POPOVER_MOTION}
            >
              <ScrollFade class="scroll-fade--surface" refreshKey={suggestions.length}>
                {suggestions.map((name, index) => (
                  <button
                    key={name}
                    type="button"
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    tabIndex={-1}
                    class={
                      index === active || (name.toLowerCase() === query && query)
                        ? "category-suggest-item category-suggest-item--on"
                        : "category-suggest-item"
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </ScrollFade>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        overlayHost?.current ?? document.body,
      )}
    </div>
  );
}
