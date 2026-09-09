import type { ComponentChildren } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { AnimatePresence, motion } from "motion/react";
import { ContextMenu, ContextMenuItem, type MenuAnchor } from "../components/ContextMenu";
import { Modal, ModalActions } from "../components/Modal";
import { ScrollFade } from "../components/ScrollFade";
import { collectCategories, type CatalogStore } from "../data/catalogStore";
import type { CatalogEntry } from "../data/schema";
import { useDismiss } from "../hooks/useDismiss";
import { useStore } from "../hooks/useStore";
import { EASE_OUT, POPOVER_MOTION } from "../lib/motion";
import { useSearch } from "../search/SearchProvider";
import { toast } from "../toast/store";
import { DeleteCardModal } from "./DeleteCardModal";
import "./catalog.css";

type CatalogListProps<T extends CatalogEntry, Draft> = {
  store: CatalogStore<T, Draft>;
  addTitle: string;
  deleteTitle: string;
  title: (item: T) => string;
  matches: (item: T, query: string) => boolean;
  emptyDraft: () => Draft;
  isDraftValid: (draft: Draft) => boolean;
  Form: (props: { value: Draft; onChange: (next: Draft) => void }) => ComponentChildren;
  onOpen: (id: string) => void;
};

export function CatalogList<T extends CatalogEntry, Draft>({
  store,
  addTitle,
  deleteTitle,
  title,
  matches,
  emptyDraft,
  isDraftValid,
  Form,
  onOpen,
}: CatalogListProps<T, Draft>) {
  const { query, focused } = useSearch();
  const items = useStore(store);
  const categories = useMemo(() => collectCategories(items), [items]);

  const filterRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<(MenuAnchor & { id: string }) | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items
        .filter((item) => matches(item, normalizedQuery))
        .filter(
          (item) =>
            selectedCategories.length === 0 || selectedCategories.includes(item.category),
        )
        .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
    [items, matches, normalizedQuery, selectedCategories],
  );
  const anchoredItem = anchor ? items.find((item) => item.id === anchor.id) : undefined;

  useDismiss(filterOpen, () => setFilterOpen(false), filterRef);

  useEffect(() => {
    if (focused) {
      setFilterOpen(false);
    }
  }, [focused]);

  useEffect(() => {
    setSelectedCategories((current) => {
      const next = current.filter((name) => categories.includes(name));
      return next.length === current.length ? current : next;
    });
  }, [categories]);

  const closeAddModal = () => {
    setAddOpen(false);
    setDraft(emptyDraft);
  };

  const toggleFilter = () => {
    const rect = filterRef.current?.getBoundingClientRect();
    if (rect) {
      setFilterPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setFilterOpen((open) => !open);
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  return (
    <section class="catalog">
      <AnimatePresence initial={false}>
        {focused ? null : (
          <motion.div
            class="catalog-toolbar"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 42, marginBottom: 15 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <div ref={filterRef} class="filter-wrap">
              <button
                type="button"
                class={
                  selectedCategories.length > 0
                    ? "ghost-btn ghost-btn--active"
                    : "ghost-btn"
                }
                aria-expanded={filterOpen}
                onClick={toggleFilter}
              >
                Фильтр
              </button>
            </div>
            <button type="button" class="ghost-btn" onClick={() => setAddOpen(true)}>
              Добавить
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollFade>
        <div class="catalog-list">
          {visible.length === 0 ? <p class="catalog-empty">Ничего не найдено</p> : null}
          {visible.map((item) => (
            <div
              key={item.id}
              class={item.pinned ? "catalog-card catalog-card--pinned" : "catalog-card"}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(item.id);
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setAnchor({ x: event.clientX, y: event.clientY, id: item.id });
              }}
            >
              <div class="catalog-card-title">{title(item)}</div>
              <div class="catalog-card-meta">{item.category}</div>
            </div>
          ))}
        </div>
      </ScrollFade>

      <AnimatePresence>
        {filterOpen ? (
          <motion.div
            class="filter-popover"
            style={filterPosition}
            onPointerDown={(event) => event.stopPropagation()}
            {...POPOVER_MOTION}
          >
            {categories.length === 0 ? (
              <p class="filter-empty">Категорий пока нет</p>
            ) : (
              <ScrollFade class="scroll-fade--surface" refreshKey={categories.length}>
                {categories.map((name) => (
                  <button
                    key={name}
                    type="button"
                    class={
                      selectedCategories.includes(name)
                        ? "filter-option filter-option--on"
                        : "filter-option"
                    }
                    onClick={() => toggleCategory(name)}
                  >
                    {name}
                  </button>
                ))}
              </ScrollFade>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ContextMenu anchor={anchoredItem ? anchor : null} onClose={() => setAnchor(null)}>
        <ContextMenuItem
          onClick={() => {
            if (anchoredItem) {
              onOpen(anchoredItem.id);
            }
            setAnchor(null);
          }}
        >
          Открыть
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            if (anchoredItem) {
              store.togglePin(anchoredItem.id);
              toast.success(anchoredItem.pinned ? "Откреплено" : "Закреплено");
            }
            setAnchor(null);
          }}
        >
          {anchoredItem?.pinned ? "Открепить" : "Закрепить"}
        </ContextMenuItem>
        <ContextMenuItem
          danger
          onClick={() => {
            setPendingDeleteId(anchoredItem?.id ?? null);
            setAnchor(null);
          }}
        >
          Удалить
        </ContextMenuItem>
      </ContextMenu>

      <Modal open={addOpen} title={addTitle} onClose={closeAddModal}>
        <Form value={draft} onChange={setDraft} />
        <ModalActions
          onCancel={closeAddModal}
          confirmLabel="Добавить"
          confirmDisabled={!isDraftValid(draft)}
          onConfirm={() => {
            store.add(draft);
            toast.success("Добавлено");
            closeAddModal();
          }}
        />
      </Modal>

      <DeleteCardModal
        open={pendingDeleteId !== null}
        title={deleteTitle}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) {
            store.remove(pendingDeleteId);
            toast.success("Удалено");
          }
          setPendingDeleteId(null);
        }}
      />
    </section>
  );
}
