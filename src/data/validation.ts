import { readImportPayload, type ImportPayload } from "./transfer";

export type ImportError =
  "invalid_format" | "corrupted" | "too_large" | "invalid_content" | "suspicious";

export type ImportResult =
  { ok: true; payload: ImportPayload } | { ok: false; error: ImportError };

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

const MAX_CATALOG_ITEMS = 3000;
const MAX_FIELD_LENGTH = 20_000;
const MAX_NESTING_DEPTH = 24;

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scanValue(value: unknown, depth: number): ImportError | null {
  if (depth > MAX_NESTING_DEPTH) {
    return "suspicious";
  }
  if (typeof value === "string") {
    return value.length > MAX_FIELD_LENGTH ? "too_large" : null;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_CATALOG_ITEMS) {
      return "too_large";
    }
    for (const item of value) {
      const error = scanValue(item, depth + 1);
      if (error) {
        return error;
      }
    }
    return null;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        return "suspicious";
      }
      const error = scanValue(nested, depth + 1);
      if (error) {
        return error;
      }
    }
  }
  return null;
}

export function validateImportPayload(raw: unknown): ImportResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "invalid_format" };
  }
  const scanError = scanValue(raw, 0);
  if (scanError) {
    return { ok: false, error: scanError };
  }
  const payload = readImportPayload(raw);
  return payload ? { ok: true, payload } : { ok: false, error: "invalid_content" };
}

export function validateEnvelope(raw: unknown, kind: string): ImportResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "invalid_format" };
  }
  if (raw.kind !== kind) {
    return { ok: false, error: "invalid_format" };
  }
  return validateImportPayload(isRecord(raw.data) ? raw.data : raw);
}

export function importErrorMessage(error: ImportError): string {
  switch (error) {
    case "invalid_format":
      return "Нужен файл .thelp";
    case "corrupted":
      return "Файл повреждён или изменён";
    case "too_large":
      return "Файл слишком большой";
    case "invalid_content":
      return "В файле нет подходящих данных или есть некорректные записи";
    case "suspicious":
      return "Файл выглядит небезопасным";
  }
}
