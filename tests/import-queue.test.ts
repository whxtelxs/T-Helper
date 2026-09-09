import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ImportResult } from "../src/data/validation";
const mocks = vi.hoisted(() => ({
  parse: vi.fn<(bytes: Uint8Array) => Promise<ImportResult>>(),
  flush: vi.fn<() => Promise<void>>(),
  replace: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("../src/data/parseInWorker", () => ({ parseInWorker: mocks.parse }));
vi.mock("../src/lib/storage", () => ({ flushStoredWrites: mocks.flush }));
vi.mock("../src/phrases/store", () => ({ phraseStore: { replaceAll: mocks.replace } }));
vi.mock("../src/situations/store", () => ({
  situationStore: { replaceAll: mocks.replace },
}));
vi.mock("../src/softs/store", () => ({ softStore: { replaceAll: mocks.replace } }));
vi.mock("../src/toast/store", () => ({
  toast: { success: mocks.success, error: mocks.error },
}));
import {
  cancelImport,
  confirmImport,
  openImportBytes,
  pendingImport,
} from "../src/data/importStore";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.flush.mockResolvedValue(undefined);
  mocks.parse.mockImplementation((bytes) =>
    Promise.resolve({
      ok: true,
      payload: {
        phrases: [
          {
            id: String(bytes[0]),
            category: "Категория",
            pinned: false,
            text: { male: "Текст", female: "Текст" },
          },
        ],
      },
    }),
  );
});
afterEach(() => cancelImport());

it("keeps a second import queued until the current preview closes", async () => {
  await openImportBytes(new Uint8Array([1]));
  const second = openImportBytes(new Uint8Array([2]));
  await Promise.resolve(undefined);
  expect(mocks.parse).toHaveBeenCalledTimes(1);
  expect(pendingImport.get()?.payload.phrases?.[0]?.id).toBe("1");
  cancelImport();
  await second;
  expect(pendingImport.get()?.payload.phrases?.[0]?.id).toBe("2");
});

it("continues after a worker failure", async () => {
  mocks.parse.mockRejectedValueOnce(new Error("worker"));
  await openImportBytes(new Uint8Array([1]));
  await openImportBytes(new Uint8Array([2]));
  expect(mocks.error).toHaveBeenCalledOnce();
  expect(pendingImport.get()?.payload.phrases?.[0]?.id).toBe("2");
});

it("reports success only after persistence and refuses cancellation during commit", async () => {
  await openImportBytes(new Uint8Array([1]));
  const saved = Promise.withResolvers<undefined>();
  mocks.flush.mockReturnValueOnce(saved.promise);
  const confirmation = confirmImport();
  cancelImport();
  expect(pendingImport.get()?.saving).toBe(true);
  expect(mocks.success).not.toHaveBeenCalled();
  await confirmImport();
  expect(mocks.replace).toHaveBeenCalledTimes(1);
  saved.resolve(undefined);
  await confirmation;
  expect(pendingImport.get()).toBeNull();
  expect(mocks.success).toHaveBeenCalledOnce();
});

it("keeps the import available for retry after failed persistence", async () => {
  await openImportBytes(new Uint8Array([1]));
  mocks.flush.mockRejectedValueOnce(new Error("full"));
  await confirmImport();
  expect(pendingImport.get()?.saving).toBe(false);
  expect(mocks.success).not.toHaveBeenCalled();
  await confirmImport();
  expect(pendingImport.get()).toBeNull();
});
