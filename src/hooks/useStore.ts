import { useSyncExternalStore } from "preact/compat";
import type { Readable } from "../lib/createStore";

export function useStore<T>(store: Readable<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
