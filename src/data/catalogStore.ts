import { createStore, type Readable } from "../lib/createStore";
import type { CatalogEntry } from "./schema";

export type CatalogStore<T extends CatalogEntry, Draft> = Readable<T[]> & {
  getCategories: () => string[];
  add: (draft: Draft) => string;
  update: (id: string, draft: Draft) => void;
  togglePin: (id: string) => void;
  remove: (id: string) => void;
  replaceAll: (items: readonly unknown[]) => void;
  clear: () => void;
};

type CatalogConfig<T extends CatalogEntry, Draft> = {
  key: string;
  legacyKeys?: readonly string[];
  parse: (raw: unknown) => T | null;
  normalize: (draft: Draft) => Omit<T, keyof CatalogEntry> & { category: string };
};

export function collectCategories(items: readonly CatalogEntry[]): string[] {
  const names = new Set<string>();
  for (const item of items) {
    const name = item.category.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ru"));
}

export function createCatalogStore<T extends CatalogEntry, Draft>({
  key,
  legacyKeys,
  parse,
  normalize,
}: CatalogConfig<T, Draft>): CatalogStore<T, Draft> {
  const parseAll = (raw: unknown): T[] | null => {
    if (!Array.isArray(raw)) return null;
    const identifiers = new Set<string>();
    return raw
      .map(parse)
      .filter((item): item is T => item !== null)
      .map((item) => {
        const id = identifiers.has(item.id) ? crypto.randomUUID() : item.id;
        identifiers.add(id);
        return id === item.id ? item : { ...item, id };
      });
  };

  const store = createStore<T[]>({
    key,
    legacyKeys,
    fallback: () => [],
    parse: parseAll,
  });

  return {
    get: store.get,
    subscribe: store.subscribe,

    getCategories: () => collectCategories(store.get()),

    add(draft) {
      const id = crypto.randomUUID();
      const item = parse({ ...normalize(draft), id, pinned: false });
      if (!item) throw new Error("Invalid catalog entry");
      store.update((items) => [item, ...items]);
      return id;
    },

    update(id, draft) {
      const patch = normalize(draft);
      store.update((items) =>
        items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },

    togglePin(id) {
      store.update((items) =>
        items.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item)),
      );
    },

    remove(id) {
      store.update((items) => items.filter((item) => item.id !== id));
    },

    replaceAll(items) {
      const parsed = parseAll(items);
      if (parsed?.length !== items.length) throw new Error("Invalid catalog entries");
      store.set(parsed);
    },

    clear() {
      store.set([]);
    },
  };
}
