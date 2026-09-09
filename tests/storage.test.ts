import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
class MemoryStorage {
  values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", new MemoryStorage());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("durable storage", () => {
  it("migrates legacy data, keeps startup settings, and restores committed edits", async () => {
    localStorage.setItem("t-helper-notepad", JSON.stringify({ note: "до миграции" }));
    localStorage.setItem("t-helper-settings", JSON.stringify({ theme: "light" }));
    let storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    expect(storage.readStored("t-helper-notepad")).toEqual({ note: "до миграции" });
    expect(localStorage.getItem("t-helper-notepad")).toBeNull();
    expect(storage.readStored("t-helper-settings")).toEqual({ theme: "light" });
    storage.writeStored("t-helper-notepad", { note: "после миграции" });
    await storage.flushStoredWrites();
    localStorage.setItem("t-helper-notepad", JSON.stringify({ note: "устарело" }));
    vi.resetModules();
    storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    expect(storage.readStored("t-helper-notepad")).toEqual({ note: "после миграции" });
  });
  it("coalesces rapid typing and flushes the last value before the timer fires", async () => {
    const storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    const put = vi.spyOn(IDBObjectStore.prototype, "put");
    for (let index = 0; index < 100; index++)
      storage.writeStored("t-helper-notepad", { note: String(index) });
    expect(put).not.toHaveBeenCalled();
    expect(storage.hasPendingWrites()).toBe(true);
    await storage.flushStoredWrites();
    expect(put).toHaveBeenCalledTimes(1);
    expect(storage.readStored("t-helper-notepad")).toEqual({ note: "99" });
    expect(storage.hasPendingWrites()).toBe(false);
  });
  it("does not lose an edit that arrives during an active transaction", async () => {
    const storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    storage.writeStored("t-helper-notepad", "first");
    const flushing = storage.flushStoredWrites();
    storage.writeStored("t-helper-notepad", "last");
    await Promise.all([flushing, storage.flushStoredWrites()]);
    vi.resetModules();
    const restored = await import("../src/lib/storage");
    await restored.initializeStorage();
    expect(restored.readStored("t-helper-notepad")).toBe("last");
  });
  it("flushes an edit queued immediately after an empty flush", async () => {
    const storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    const first = storage.flushStoredWrites();
    storage.writeStored("t-helper-notepad", "latest");
    await Promise.all([first, storage.flushStoredWrites()]);
    expect(storage.hasPendingWrites()).toBe(false);
    vi.resetModules();
    const restored = await import("../src/lib/storage");
    await restored.initializeStorage();
    expect(restored.readStored("t-helper-notepad")).toBe("latest");
  });
  it("retains dirty data on write failure and supports retry", async () => {
    const storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    storage.writeStored("t-helper-notepad", "important");
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await expect(storage.flushStoredWrites()).rejects.toThrow("Full");
    expect(storage.hasPendingWrites()).toBe(true);
    expect(storage.readStored("t-helper-notepad")).toBe("important");
    await storage.flushStoredWrites();
    expect(storage.hasPendingWrites()).toBe(false);
  });
  it("keeps the original legacy copy when migration fails", async () => {
    localStorage.setItem("t-helper-notepad", '"original"');
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(() => {
      throw new Error("Disk full");
    });
    const storage = await import("../src/lib/storage");
    await expect(storage.initializeStorage()).rejects.toThrow("Disk full");
    expect(localStorage.getItem("t-helper-notepad")).toBe('"original"');
  });
  it("does not save or notify for an unchanged store reference", async () => {
    const storage = await import("../src/lib/storage");
    await storage.initializeStorage();
    const { createStore } = await import("../src/lib/createStore");
    const store = createStore({
      key: "test",
      fallback: () => ({ value: 1 }),
      parse: () => null,
    });
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((state) => state);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.hasPendingWrites()).toBe(false);
    store.set({ value: 2 });
    expect(listener).toHaveBeenCalledOnce();
    await storage.flushStoredWrites();
    expect(storage.readStored("test")).toEqual({ value: 2 });
  });
});
