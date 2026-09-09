import { checkVelopack } from "./velopack";
import { fetchLatestRelease, isOnline, RELEASES_PAGE_URL } from "./github";
import { isNewerVersion } from "./version";
import {
  cachedRelease,
  checkIsDue,
  rememberLatest,
  rememberNoUpdate,
  shouldPrompt,
  type CachedRelease,
} from "./store";
export type UpdateNotice = {
  release: CachedRelease;
  canApply: boolean;
};
export async function checkForUpdate(
  current: string,
  signal: AbortSignal,
): Promise<UpdateNotice | null> {
  const cancelled = () => signal.aborted;
  const cached = cachedRelease();
  const eligible = (release: CachedRelease) =>
    !cancelled() &&
    isNewerVersion(release.version, current) &&
    shouldPrompt(release.version);
  const cachedNotice = () =>
    cached && eligible(cached)
      ? { release: { ...cached, url: RELEASES_PAGE_URL }, canApply: false }
      : null;
  if (cancelled()) return null;
  if (!isOnline()) return cachedNotice();
  if (!checkIsDue() && !(cached && eligible(cached))) return null;
  const packed = await checkVelopack();
  if (cancelled()) return null;
  if (packed?.installed) {
    if (!packed.available || !packed.version) {
      rememberNoUpdate();
      return null;
    }
    const release = { version: packed.version, url: RELEASES_PAGE_URL };
    rememberLatest(release);
    return eligible(release) ? { release, canApply: true } : null;
  }
  const latest = await fetchLatestRelease(signal);
  if (cancelled()) return null;
  if (!latest) return cachedNotice();
  if (!isNewerVersion(latest.version, current)) {
    rememberNoUpdate();
    return null;
  }
  rememberLatest(latest);
  return eligible(latest) ? { release: latest, canApply: false } : null;
}
