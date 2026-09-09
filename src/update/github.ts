import { normalizeVersion, isValidVersion } from "./version";
import { getVersion } from "@tauri-apps/api/app";

const REPO = "whxtelxs/T-Helper";
const LATEST_API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const LATEST_SITE_URL = `https://github.com/${REPO}/releases/latest`;
export const RELEASES_PAGE_URL = LATEST_SITE_URL;

const FETCH_TIMEOUT_MS = 10_000;

export type GithubRelease = {
  version: string;
  url: string;
};

export async function readAppVersion(): Promise<string | null> {
  try {
    const version = await getVersion();
    if (typeof version === "string" && isValidVersion(version)) {
      return version;
    }
  } catch {
    return null;
  }
  return null;
}

function isReleaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "github.com" &&
      parsed.pathname.startsWith(`/${REPO}/`)
    );
  } catch {
    return false;
  }
}

function parseRelease(payload: unknown): GithubRelease | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const { tag_name: tagName, html_url: htmlUrl } = payload as Record<string, unknown>;
  if (typeof tagName !== "string" || tagName.trim().length === 0) {
    return null;
  }
  const version = normalizeVersion(tagName);
  if (!isValidVersion(version)) {
    return null;
  }
  const url =
    typeof htmlUrl === "string" && isReleaseUrl(htmlUrl) ? htmlUrl : RELEASES_PAGE_URL;
  return { version, url };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function runWhenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(task, { timeout: 2500 });
    return () => {
      window.cancelIdleCallback(idleId);
    };
  }
  const timer = window.setTimeout(task, 0);
  return () => {
    window.clearTimeout(timer);
  };
}

async function fetchReleaseJson(
  url: string,
  accept: string,
  signal?: AbortSignal,
): Promise<GithubRelease | null> {
  if (signal?.aborted || !isOnline()) {
    return null;
  }

  const controller = new AbortController();
  const abort = () => {
    controller.abort();
  };
  const timer = window.setTimeout(abort, FETCH_TIMEOUT_MS);
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      priority: "low",
      headers: {
        Accept: accept,
      },
    });
    if (!response.ok) {
      return null;
    }
    const payload: unknown = await response.json();
    return parseRelease(payload);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<GithubRelease | null> {
  const fromApi = await fetchReleaseJson(
    LATEST_API_URL,
    "application/vnd.github+json",
    signal,
  );
  if (fromApi !== null) {
    return fromApi;
  }
  return fetchReleaseJson(LATEST_SITE_URL, "application/json", signal);
}
