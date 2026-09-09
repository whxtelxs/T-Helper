import { describe, expect, it } from "vitest";
import { packThelp, parseThelp } from "../src/data/thelp";
import { MAX_IMPORT_BYTES, validateImportPayload } from "../src/data/validation";

const phrase = {
  id: "one",
  category: " Работа ",
  pinned: true,
  text: { male: "Готов", female: "Готова" },
};

describe("package validation", () => {
  it("round trips supported catalogs and normalizes categories", async () => {
    const bytes = await packThelp({ phrases: [phrase] });
    expect(await parseThelp(bytes)).toEqual({
      ok: true,
      payload: { phrases: [{ ...phrase, category: "Работа" }] },
    });
  });
  it("reads legacy gender-independent text", () => {
    const result = validateImportPayload({ phrases: [{ ...phrase, text: "Текст" }] });
    expect(result).toMatchObject({
      ok: true,
      payload: { phrases: [{ text: { male: "Текст", female: "Текст" } }] },
    });
  });
  it("rejects conflicting identifiers and malformed rows without importing a partial catalog", () => {
    for (const phrases of [
      [phrase, phrase],
      [phrase, { ...phrase, id: " " }],
      [phrase, { id: "two" }],
    ]) {
      expect(validateImportPayload({ phrases })).toEqual({
        ok: false,
        error: "invalid_content",
      });
    }
  });
  it("allows an identifier to occur in different catalogs", () => {
    expect(
      validateImportPayload({
        phrases: [phrase],
        situations: [
          { id: "one", category: "Работа", clientWants: "Вопрос", useScript: "Ответ" },
        ],
      }).ok,
    ).toBe(true);
  });
  it("rejects prototype keys and excessive nesting", () => {
    const malicious: unknown = JSON.parse('{"phrases":[],"__proto__":{"polluted":true}}');
    expect(validateImportPayload(malicious)).toEqual({ ok: false, error: "suspicious" });
    let nested: unknown = "text";
    for (let index = 0; index < 30; index++) nested = { nested };
    expect(validateImportPayload({ phrases: [phrase], nested })).toEqual({
      ok: false,
      error: "suspicious",
    });
  });
  it("rejects tampering, truncation and unrelated files", async () => {
    const bytes = await packThelp({ phrases: [phrase] });
    const changed = bytes.slice();
    changed[changed.length - 1] = (changed.at(-1) ?? 0) ^ 1;
    expect(await parseThelp(changed)).toEqual({ ok: false, error: "corrupted" });
    expect(await parseThelp(bytes.slice(0, -1))).toEqual({
      ok: false,
      error: "corrupted",
    });
    expect(await parseThelp(new Uint8Array([1, 2]))).toEqual({
      ok: false,
      error: "invalid_format",
    });
  });
  it("rejects an export that would exceed the import byte limit", async () => {
    const phrases = Array.from({ length: 230 }, (_, index) => ({
      ...phrase,
      id: String(index),
      text: { male: "x".repeat(20_000), female: "x".repeat(20_000) },
    }));
    await expect(packThelp({ phrases })).rejects.toThrow("8 МБ");
    expect(await parseThelp(new Uint8Array(MAX_IMPORT_BYTES + 1))).toEqual({
      ok: false,
      error: "too_large",
    });
  });
});
