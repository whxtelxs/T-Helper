const SETTINGS_KEY = "t-helper-settings";
const DATABASE_NAME = "t-helper";
const STORE_NAME = "entries";
const WRITE_DELAY_MS = 300;
type PendingWrite = {
  value: unknown;
  revision: number;
};
const values = new Map<string, unknown>();
const pending = new Map<string, PendingWrite>();
let revision = 0;
let database: IDBDatabase | undefined;
let initialization: Promise<void> | undefined;
let inFlight: Promise<void> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let reportError: (error: unknown) => void = (error) =>
  console.error("Не удалось сохранить данные", error);
export function onStorageError(handler: (error: unknown) => void): void {
  reportError = handler;
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Storage transaction aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Storage transaction failed"));
  });
}
export function initializeStorage(): Promise<void> {
  initialization ??= (async () => {
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error ?? new Error("Storage unavailable"));
      request.onblocked = () => {
        blocked = true;
        reject(new Error("Закройте другие окна T-Helper и повторите запуск"));
      };
    });
    database.onversionchange = () => {
      database?.close();
    };
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionDone(transaction);
    const cursor = transaction.objectStore(STORE_NAME).openCursor();
    cursor.onsuccess = () => {
      const entry = cursor.result;
      if (entry) {
        if (typeof entry.key === "string") values.set(entry.key, entry.value as unknown);
        entry.continue();
      }
    };
    await done;
    const migrated: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith("t-helper-") || key === SETTINGS_KEY) continue;
      const raw = localStorage.getItem(key);
      if (raw === null) continue;
      if (!values.has(key)) {
        try {
          const value: unknown = JSON.parse(raw);
          values.set(key, value);
          pending.set(key, { value, revision: ++revision });
        } catch {
          continue;
        }
      }
      migrated.push(key);
    }
    await flushStoredWrites();
    for (const key of migrated) localStorage.removeItem(key);
  })();
  return initialization;
}
export function readStored(key: string): unknown {
  if (key !== SETTINGS_KEY) return values.get(key) ?? null;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
export function writeStored(key: string, value: unknown): void {
  if (key === SETTINGS_KEY) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      reportError(error);
      throw error;
    }
    return;
  }
  values.set(key, value);
  pending.set(key, { value, revision: ++revision });
  timer ??= setTimeout(() => {
    timer = undefined;
    void flushStoredWrites().catch(reportError);
  }, WRITE_DELAY_MS);
}
export function hasPendingWrites(): boolean {
  return pending.size > 0 || inFlight !== undefined;
}
export async function flushStoredWrites(): Promise<void> {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  while (pending.size > 0 || inFlight) {
    const active = (inFlight ??= drainWrites());
    try {
      await active;
    } finally {
      if (inFlight === active) inFlight = undefined;
    }
  }
}
async function drainWrites(): Promise<void> {
  while (pending.size > 0) {
    if (!database) throw new Error("Storage is not initialized");
    const batch = new Map(pending);
    const transaction = database.transaction(STORE_NAME, "readwrite", {
      durability: "strict",
    });
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    try {
      for (const [key, entry] of batch) store.put(entry.value, key);
    } catch (error) {
      transaction.abort();
      await done.catch(() => undefined);
      throw error;
    }
    await done;
    for (const [key, entry] of batch) {
      if (pending.get(key)?.revision === entry.revision) pending.delete(key);
    }
  }
}
