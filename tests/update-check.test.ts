import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  check: vi.fn(),
  fetch: vi.fn(),
  read: vi.fn(),
  online: vi.fn(),
}));
vi.mock("../src/update/velopack", () => ({ checkVelopack: mocks.check }));
vi.mock("../src/update/github", () => ({
  fetchLatestRelease: mocks.fetch,
  isOnline: mocks.online,
  RELEASES_PAGE_URL: "https://github.com/whxtelxs/T-Helper/releases/latest",
}));
vi.mock("../src/lib/storage", () => ({ readStored: mocks.read, writeStored: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
  mocks.read.mockReturnValue(null);
  mocks.online.mockReturnValue(true);
  mocks.fetch.mockReset();
  mocks.check.mockReset();
});

it("rehydrates a cached native update even within the daily interval", async () => {
  const { rememberLatest } = await import("../src/update/store");
  rememberLatest({
    version: "2.0.0",
    url: "https://github.com/whxtelxs/T-Helper/releases/latest",
  });
  mocks.check.mockResolvedValue({ installed: true, available: true, version: "2.0.0" });
  const { checkForUpdate } = await import("../src/update/check");
  expect(await checkForUpdate("1.0.0", new AbortController().signal)).toMatchObject({
    canApply: true,
    release: { version: "2.0.0" },
  });
  expect(mocks.check).toHaveBeenCalledOnce();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("snoozes one version for a day but does not hide a newer release", async () => {
  const store = await import("../src/update/store");
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  store.dismissUpdate("2.0.0");
  expect(store.shouldPrompt("2.0.0", now + 1000)).toBe(false);
  expect(store.shouldPrompt("2.0.0", now + store.UPDATE_CHECK_INTERVAL_MS)).toBe(true);
  expect(store.shouldPrompt("2.0.1", now)).toBe(true);
});
it("migrates the old permanent dismissal without losing cached release data", async () => {
  mocks.read.mockReturnValue({
    lastCheckAt: Date.now(),
    dismissed: "2.0.0",
    latestVersion: "2.0.0",
    latestUrl: "url",
    ackAt: Date.now(),
  });
  const store = await import("../src/update/store");
  expect(store.shouldPrompt("2.0.0")).toBe(true);
  expect(store.cachedRelease()?.version).toBe("2.0.0");
});
it("does not resurrect a notification dismissed during an in-flight check", async () => {
  let resolve!: (result: unknown) => void;
  mocks.check.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const store = await import("../src/update/store");
  const { checkForUpdate } = await import("../src/update/check");
  const result = checkForUpdate("1.0.0", new AbortController().signal);
  store.dismissUpdate("2.0.0");
  resolve({ installed: true, available: true, version: "2.0.0" });
  expect(await result).toBeNull();
});
it("does not mutate cache or show a notification after cancellation", async () => {
  let resolve!: (result: unknown) => void;
  mocks.check.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const store = await import("../src/update/store");
  const { checkForUpdate } = await import("../src/update/check");
  const controller = new AbortController();
  const result = checkForUpdate("1.0.0", controller.signal);
  controller.abort();
  resolve({ installed: true, available: true, version: "2.0.0" });
  expect(await result).toBeNull();
  expect(store.cachedRelease()).toBeNull();
});
it("caches a successful no-update result and does not make a redundant GitHub request", async () => {
  mocks.check.mockResolvedValue({ installed: true, available: false, version: null });
  const { checkForUpdate } = await import("../src/update/check");
  const store = await import("../src/update/store");
  await checkForUpdate("1.0.0", new AbortController().signal);
  expect(store.checkIsDue()).toBe(false);
  expect(mocks.fetch).not.toHaveBeenCalled();
});
