import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { finishAppSession } from "../lib/appExit";

export type VelopackStatus = {
  installed: boolean;
  available: boolean;
  version: string | null;
};

export async function checkVelopack(): Promise<VelopackStatus | null> {
  if (!isTauri()) {
    return null;
  }
  try {
    return await invoke<VelopackStatus>("check_update");
  } catch {
    return null;
  }
}

export async function installVelopack(
  version: string,
): Promise<"ok" | "network" | "fail" | "save"> {
  if (!isTauri()) {
    return "fail";
  }
  try {
    await invoke("install_update", { expectedVersion: version });
    const result = await finishAppSession(() =>
      invoke("apply_update", { expectedVersion: version }),
    );
    return result === "complete" ? "ok" : result === "save-failed" ? "save" : "fail";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("network") || message.includes("not-installed")) {
      return "network";
    }
    return "fail";
  }
}

export async function listenUpdateProgress(
  onProgress: (percent: number) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined;
  }
  return listen<number>("update://progress", (event) => {
    onProgress(event.payload);
  });
}
