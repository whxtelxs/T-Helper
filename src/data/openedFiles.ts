import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "../toast/store";
import { openImportBytes, pendingImport } from "./importStore";
import { importErrorMessage } from "./validation";
export function watchOpenedFiles(): () => void {
  if (!isTauri()) return () => undefined;
  let disposed = false;
  let draining = false;
  let requested = false;
  const isDisposed = () => disposed;
  const canDrain = () => requested && !isDisposed() && !pendingImport.get();
  const drain = async () => {
    requested = true;
    if (draining || disposed || pendingImport.get()) return;
    draining = true;
    try {
      while (canDrain()) {
        requested = false;
        try {
          const buffer = await invoke<ArrayBuffer>("take_opened_file");
          if (isDisposed()) break;
          if (buffer.byteLength === 0) continue;
          await openImportBytes(new Uint8Array(buffer));
          requested = true;
        } catch (error) {
          toast.error(
            error === "too_large"
              ? importErrorMessage("too_large")
              : "Не удалось прочитать файл .thelp",
          );
          requested = true;
          if (
            error !== "too_large" &&
            error !== "read_failed" &&
            error !== "invalid_format"
          )
            break;
        }
      }
    } finally {
      draining = false;
    }
  };
  const unsubscribe = pendingImport.subscribe(() => {
    if (!pendingImport.get()) void drain();
  });
  const unlisten = listen("thelp://open", () => {
    void drain();
  });
  void unlisten.then(
    () => {
      if (!disposed) void drain();
    },
    () => {
      toast.error("Не удалось подключить открытие файлов");
    },
  );
  return () => {
    disposed = true;
    unsubscribe();
    void unlisten.then(
      (stop) => stop(),
      () => undefined,
    );
  };
}
