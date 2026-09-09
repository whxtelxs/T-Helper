import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), flush: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock("../src/lib/storage", () => ({ flushStoredWrites: mocks.flush }));
import { installVelopack } from "../src/update/velopack";
beforeEach(() => {
  vi.stubGlobal("document", { body: { inert: false } });
  mocks.invoke.mockReset().mockResolvedValue(undefined);
  mocks.flush.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
it("downloads, then saves, then applies exactly the approved version", async () => {
  const order: string[] = [];
  mocks.invoke.mockImplementation((command: string) => {
    order.push(command);
    return Promise.resolve();
  });
  mocks.flush.mockImplementation(() => {
    expect(document.body.inert).toBe(true);
    order.push("save");
    return Promise.resolve();
  });
  expect(await installVelopack("2.0.0")).toBe("ok");
  expect(order).toEqual(["install_update", "save", "apply_update"]);
  expect(mocks.invoke).toHaveBeenLastCalledWith("apply_update", {
    expectedVersion: "2.0.0",
  });
  expect(document.body.inert).toBe(false);
});
it("does not restart if saving fails", async () => {
  mocks.flush.mockRejectedValue(new Error("Disk full"));
  expect(await installVelopack("2.0.0")).toBe("save");
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expect(document.body.inert).toBe(false);
});
it("keeps editing available during download and after a network failure", async () => {
  mocks.invoke.mockImplementation(() => {
    expect(document.body.inert).toBe(false);
    return Promise.reject(new Error("network"));
  });
  expect(await installVelopack("2.0.0")).toBe("network");
  expect(mocks.flush).not.toHaveBeenCalled();
  expect(document.body.inert).toBe(false);
});
