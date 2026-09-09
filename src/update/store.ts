import { createStore } from "../lib/createStore";
import { isValidVersion } from "./version";
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export type CachedRelease = {
  version: string;
  url: string;
};
type UpdateState = {
  lastCheckAt: number;
  latestVersion: string;
  latestUrl: string;
  snoozedVersion: string;
  snoozedUntil: number;
};
const DEFAULT_STATE: UpdateState = {
  lastCheckAt: 0,
  latestVersion: "",
  latestUrl: "",
  snoozedVersion: "",
  snoozedUntil: 0,
};
function timestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
export const updateStore = createStore<UpdateState>({
  key: "t-helper-update",
  fallback: () => ({ ...DEFAULT_STATE }),
  parse: (raw) => {
    if (typeof raw !== "object" || raw === null) return null;
    const record = raw as Record<string, unknown>;
    return {
      lastCheckAt: timestamp(record.lastCheckAt),
      latestVersion:
        typeof record.latestVersion === "string" && isValidVersion(record.latestVersion)
          ? record.latestVersion
          : "",
      latestUrl: typeof record.latestUrl === "string" ? record.latestUrl : "",
      snoozedVersion:
        typeof record.snoozedVersion === "string" ? record.snoozedVersion : "",
      snoozedUntil: timestamp(record.snoozedUntil),
    };
  },
});
export function cachedRelease(): CachedRelease | null {
  const state = updateStore.get();
  return state.latestVersion && state.latestUrl
    ? { version: state.latestVersion, url: state.latestUrl }
    : null;
}
export function rememberLatest(release: CachedRelease): void {
  updateStore.update((state) => ({
    ...state,
    lastCheckAt: Date.now(),
    latestVersion: release.version,
    latestUrl: release.url,
  }));
}
export function rememberNoUpdate(): void {
  updateStore.update((state) => ({
    ...state,
    lastCheckAt: Date.now(),
    latestVersion: "",
    latestUrl: "",
  }));
}
export function dismissUpdate(version: string): void {
  updateStore.update((state) => ({
    ...state,
    snoozedVersion: version,
    snoozedUntil: Date.now() + UPDATE_CHECK_INTERVAL_MS,
  }));
}
export function shouldPrompt(version: string, now = Date.now()): boolean {
  const state = updateStore.get();
  return state.snoozedVersion !== version || now >= state.snoozedUntil;
}
export function checkIsDue(now = Date.now()): boolean {
  const { lastCheckAt } = updateStore.get();
  return (
    lastCheckAt === 0 ||
    now < lastCheckAt ||
    now - lastCheckAt >= UPDATE_CHECK_INTERVAL_MS
  );
}
