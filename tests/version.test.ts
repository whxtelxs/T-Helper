import { describe, expect, it } from "vitest";
import { isNewerVersion, isValidVersion } from "../src/update/version";

describe("SemVer precedence", () => {
  it("follows the complete prerelease ordering from the specification", () => {
    const versions = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0",
      "1.0.1",
      "1.1.0",
      "2.0.0",
    ];
    for (let i = 1; i < versions.length; i++) {
      const current = versions[i];
      const previous = versions[i - 1];
      if (current === undefined || previous === undefined)
        throw new Error("Missing version fixture");
      expect(isNewerVersion(current, previous)).toBe(true);
      expect(isNewerVersion(previous, current)).toBe(false);
    }
  });
  it("ignores build metadata and accepts a release tag prefix", () => {
    expect(isNewerVersion(" v1.2.0 ", "1.2.0-beta.9")).toBe(true);
    expect(isNewerVersion("1.2.0+build.2", "1.2.0+build.1")).toBe(false);
  });
  it.each([
    "1.2",
    "01.2.3",
    "1.2.3-beta.01",
    "garbage",
    "1.2.3-",
    "99999999999999999.0.0",
  ])("rejects invalid version %s", (version) => {
    expect(isValidVersion(version)).toBe(false);
    expect(isNewerVersion(version, "1.0.0")).toBe(false);
  });
});
