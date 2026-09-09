import { render } from "preact";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { App } from "./App";
import { AppBoundary } from "./app/AppBoundary";
import { finishAppSession } from "./lib/appExit";
import { flushStoredWrites, hasPendingWrites, onStorageError } from "./lib/storage";
import { toast } from "./toast/store";
import "./settings/store";

onStorageError(() =>
  toast.error(
    "Не удалось сохранить изменения. Освободите место на диске и повторите попытку.",
  ),
);

export async function launch() {
  const root = document.getElementById("root");
  if (!root) throw new Error("Не найден контейнер приложения");
  if (isTauri()) {
    await getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        const result = await finishAppSession(() => getCurrentWindow().destroy());
        if (result === "save-failed") {
          toast.error(
            "Изменения не сохранены. Проверьте свободное место на диске и повторите закрытие.",
          );
        }
      } catch {
        toast.error("Не удалось закрыть приложение. Повторите попытку.");
      }
    });
  }
  render(
    <AppBoundary>
      <App />
    </AppBoundary>,
    root,
  );
  if (isTauri()) await invoke("show_main_window");
  document.documentElement.classList.add("app-ready");
}

const flush = () => {
  void flushStoredWrites().catch(() => toast.error("Не удалось сохранить изменения"));
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) flush();
});
window.addEventListener("pagehide", flush);
window.addEventListener("beforeunload", (event) => {
  if (hasPendingWrites()) {
    flush();
    event.preventDefault();
  }
});
