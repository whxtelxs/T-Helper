import { createMemoryStore, type Readable } from "../lib/createStore";
import { phraseStore } from "../phrases/store";
import { situationStore } from "../situations/store";
import { softStore } from "../softs/store";
import { toast } from "../toast/store";
import { flushStoredWrites } from "../lib/storage";
import { THELP_EXTENSION, type Bytes } from "./thelp";
import { parseInWorker } from "./parseInWorker";
import {
  hasSelectedData,
  selectionFrom,
  type CatalogSelection,
  type ImportPayload,
} from "./transfer";
import { importErrorMessage, MAX_IMPORT_BYTES } from "./validation";

export type PendingImport = {
  payload: ImportPayload;
  selection: CatalogSelection;
  saving: boolean;
};

const pending = createMemoryStore<PendingImport | null>(null);

export const pendingImport: Readable<PendingImport | null> = pending;

const MAX_QUEUED_IMPORTS = 8;
let queuedImports = 0;
let importTail = Promise.resolve();

function waitForReview(): Promise<void> {
  if (!pending.get()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = pending.subscribe(() => {
      if (!pending.get()) {
        unsubscribe();
        resolve();
      }
    });
  });
}

function enqueueImport(read: () => Promise<Bytes>): Promise<void> {
  if (queuedImports >= MAX_QUEUED_IMPORTS) {
    toast.error("Завершите текущий импорт перед открытием новых файлов");
    return Promise.resolve();
  }
  queuedImports += 1;
  const task = importTail.then(async () => {
    await waitForReview();
    const result = await parseInWorker(await read());
    if (!result.ok) {
      toast.error(importErrorMessage(result.error));
      return;
    }
    pending.set({
      payload: result.payload,
      selection: selectionFrom(result.payload),
      saving: false,
    });
  });
  importTail = task
    .catch(() => {
      toast.error("Не удалось прочитать файл .thelp");
    })
    .finally(() => {
      queuedImports -= 1;
    });
  return importTail;
}

export function openImportBytes(bytes: Bytes): Promise<void> {
  return enqueueImport(() => Promise.resolve(bytes));
}

export async function openImportFile(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith(THELP_EXTENSION)) {
    toast.error("Нужен файл .thelp");
    return;
  }
  try {
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(importErrorMessage("too_large"));
      return;
    }
    await enqueueImport(async () => new Uint8Array(await file.arrayBuffer()));
  } catch {
    toast.error("Не удалось прочитать файл");
  }
}

export function setImportSelection(selection: CatalogSelection): void {
  pending.update((current) =>
    current && !current.saving ? { ...current, selection } : current,
  );
}

export function cancelImport(): void {
  if (!pending.get()?.saving) pending.set(null);
}

export async function confirmImport(): Promise<void> {
  const current = pending.get();
  if (
    !current ||
    current.saving ||
    !hasSelectedData(current.selection, current.payload)
  ) {
    return;
  }
  const { payload, selection } = current;
  pending.set({ ...current, saving: true });
  if (selection.situations && payload.situations) {
    situationStore.replaceAll(payload.situations);
  }
  if (selection.softs && payload.softs) {
    softStore.replaceAll(payload.softs);
  }
  if (selection.phrases && payload.phrases) {
    phraseStore.replaceAll(payload.phrases);
  }
  try {
    await flushStoredWrites();
    pending.set(null);
    toast.success("Данные импортированы");
  } catch {
    pending.set({ ...current, saving: false });
    toast.error(
      "Не удалось сохранить импорт. Освободите место на диске и повторите попытку.",
    );
  }
}
