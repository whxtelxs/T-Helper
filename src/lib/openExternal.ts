import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "../toast/store";

export async function openExternal(url: string): Promise<void> {
  try {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.username || target.password) {
      throw new Error("Unsupported external URL");
    }
    if (isTauri()) await openUrl(target.href);
    else window.open(target.href, "_blank", "noopener,noreferrer");
  } catch {
    toast.error("Не удалось открыть ссылку");
  }
}
