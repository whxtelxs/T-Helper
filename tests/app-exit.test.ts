import { afterEach, beforeEach, expect, it, vi } from "vitest";
const flush = vi.hoisted(() => vi.fn<() => Promise<void>>());
vi.mock("../src/lib/storage", () => ({ flushStoredWrites: flush }));
import { finishAppSession } from "../src/lib/appExit";

beforeEach(() => {
  vi.stubGlobal("document", { body: { inert: false } });
  flush.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

it("allows only one final operation while saving and restores the previous input state", async () => {
  const saving = Promise.withResolvers<undefined>();
  flush.mockReturnValue(saving.promise);
  const close = vi.fn(() => Promise.resolve());
  const restart = vi.fn(() => Promise.resolve());
  const first = finishAppSession(close);
  expect(document.body.inert).toBe(true);
  expect(await finishAppSession(restart)).toBe("busy");
  expect(restart).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  saving.resolve(undefined);
  expect(await first).toBe("complete");
  expect(close).toHaveBeenCalledOnce();
  expect(document.body.inert).toBe(false);
});

it("preserves an existing input lock after a failed final action", async () => {
  document.body.inert = true;
  await expect(
    finishAppSession(() => Promise.reject(new Error("failed"))),
  ).rejects.toThrow("failed");
  expect(document.body.inert).toBe(true);
  expect(await finishAppSession(() => Promise.resolve())).toBe("complete");
});

it("leaves the application open if persistence fails and allows retry", async () => {
  flush.mockRejectedValueOnce(new Error("full"));
  const close = vi.fn(() => Promise.resolve());
  expect(await finishAppSession(close)).toBe("save-failed");
  expect(close).not.toHaveBeenCalled();
  expect(document.body.inert).toBe(false);
  expect(await finishAppSession(close)).toBe("complete");
});
