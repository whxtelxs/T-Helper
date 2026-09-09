import { readStored, writeStored } from "./storage";

export type Readable<T> = {
  get: () => T;
  subscribe: (listener: () => void) => () => void;
};

export type Store<T> = Readable<T> & {
  set: (next: T) => void;
  update: (updater: (current: T) => T) => void;
};

type StoreConfig<T> = {
  key: string;
  legacyKeys?: readonly string[];
  fallback: () => T;
  parse: (raw: unknown) => T | null;
};

export function createMemoryStore<T>(initial: T): Store<T> {
  const listeners = new Set<() => void>();
  let state = initial;

  const set = (next: T) => {
    if (Object.is(state, next)) return;
    state = next;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    get: () => state,
    set,
    update: (updater) => set(updater(state)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createStore<T>({
  key,
  legacyKeys = [],
  fallback,
  parse,
}: StoreConfig<T>): Store<T> {
  const listeners = new Set<() => void>();

  let state = fallback();
  for (const source of [key, ...legacyKeys]) {
    const restored = parse(readStored(source));
    if (restored !== null) {
      state = restored;
      if (source !== key) {
        writeStored(key, state);
      }
      break;
    }
  }

  const set = (next: T) => {
    if (Object.is(state, next)) return;
    writeStored(key, next);
    state = next;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    get: () => state,
    set,
    update: (updater) => set(updater(state)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
