import type { Bytes } from "./thelp";
import type { ImportPayload } from "./transfer";
import { MAX_IMPORT_BYTES, type ImportResult } from "./validation";

export type PackageRequest =
  { type: "parse"; bytes: Bytes } | { type: "pack"; data: ImportPayload };

export type PackageResponse =
  | { type: "parsed"; result: ImportResult }
  | { type: "packed"; bytes: Bytes }
  | { type: "error"; message: string };

export async function parseInWorker(bytes: Bytes): Promise<ImportResult> {
  if (bytes.byteLength > MAX_IMPORT_BYTES) return { ok: false, error: "too_large" };
  const response = await runPackageWorker({ type: "parse", bytes });
  if (response.type !== "parsed") throw new Error("Unexpected package response");
  return response.result;
}

export async function packInWorker(data: ImportPayload): Promise<Bytes> {
  const response = await runPackageWorker({ type: "pack", data });
  if (response.type !== "packed") throw new Error("Unexpected package response");
  return response.bytes;
}

function runPackageWorker(request: PackageRequest): Promise<PackageResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./thelp.worker.ts", import.meta.url), {
      type: "module",
    });
    const stop = () => {
      window.clearTimeout(timer);
      worker.terminate();
    };
    const timer = window.setTimeout(() => {
      stop();
      reject(new Error("Обработка пакета превысила время ожидания"));
    }, 30_000);
    worker.onmessage = (event: MessageEvent<PackageResponse>) => {
      stop();
      if (event.data.type === "error") reject(new Error(event.data.message));
      else resolve(event.data);
    };
    worker.onerror = () => {
      stop();
      reject(new Error("Import worker failed"));
    };
    worker.onmessageerror = () => {
      stop();
      reject(new Error("Import worker returned an unreadable message"));
    };
    try {
      worker.postMessage(request, request.type === "parse" ? [request.bytes.buffer] : []);
    } catch (error) {
      stop();
      reject(new Error("Failed to send data to the import worker", { cause: error }));
    }
  });
}
