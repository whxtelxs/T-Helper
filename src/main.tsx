import { invoke, isTauri } from "@tauri-apps/api/core";
import { initializeStorage } from "./lib/storage";
import { installUiGuard } from "./lib/uiGuard";
import "./styles/global.css";

installUiGuard();

let storageReady = false;

async function start() {
  await initializeStorage();
  storageReady = true;
  const { launch } = await import("./bootstrap");
  await launch();
}

void start().catch(async (error: unknown) => {
  console.error("Не удалось запустить приложение", error);
  const root = document.getElementById("root");
  if (root) {
    const message = document.createElement("p");
    message.textContent = storageReady
      ? "Не удалось запустить интерфейс. Повторите запуск приложения."
      : "Не удалось открыть хранилище данных. Закройте другие окна приложения и повторите запуск. Ваши данные не сброшены.";
    const retry = document.createElement("button");
    retry.textContent = "Повторить";
    retry.onclick = () => location.reload();
    root.replaceChildren(message, retry);
    root.style.padding = "24px";
  }
  if (isTauri()) await invoke("show_main_window").catch(console.error);
});
