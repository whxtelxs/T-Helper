import {
  parsePhrase,
  parseSituation,
  parseSoft,
  type Phrase,
  type Situation,
  type Soft,
} from "./schema";

export type CatalogKey = "situations" | "softs" | "phrases";

export type CatalogSelection = Record<CatalogKey, boolean>;

export type CatalogData = {
  situations: Situation[];
  softs: Soft[];
  phrases: Phrase[];
};

export type ImportPayload = Partial<CatalogData>;

export const CATALOG_KEYS: readonly CatalogKey[] = ["situations", "softs", "phrases"];

export const CATALOG_LABELS: Record<CatalogKey, string> = {
  situations: "Ситуации",
  softs: "Софты",
  phrases: "Фразы",
};

export function emptySelection(): CatalogSelection {
  return { situations: false, softs: false, phrases: false };
}

export function selectionFrom(data: ImportPayload): CatalogSelection {
  return {
    situations: Boolean(data.situations?.length),
    softs: Boolean(data.softs?.length),
    phrases: Boolean(data.phrases?.length),
  };
}

export function hasSelection(selection: CatalogSelection): boolean {
  return CATALOG_KEYS.some((key) => selection[key]);
}

export function hasAnyData(data: ImportPayload): boolean {
  return CATALOG_KEYS.some((key) => Boolean(data[key]?.length));
}

export function hasSelectedData(
  selection: CatalogSelection,
  data: ImportPayload,
): boolean {
  return CATALOG_KEYS.some((key) => selection[key] && Boolean(data[key]?.length));
}

export function pickCatalogs(
  selection: CatalogSelection,
  data: CatalogData,
): ImportPayload {
  const payload: ImportPayload = {};
  if (selection.situations) {
    payload.situations = data.situations;
  }
  if (selection.softs) {
    payload.softs = data.softs;
  }
  if (selection.phrases) {
    payload.phrases = data.phrases;
  }
  return payload;
}

function readCatalog<T extends { id: string }>(
  value: unknown,
  parse: (raw: unknown) => T | null,
): T[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const result: T[] = [];
  const identifiers = new Set<string>();
  for (const raw of value) {
    const item = parse(raw);
    if (!item || identifiers.has(item.id)) return null;
    identifiers.add(item.id);
    result.push(item);
  }
  return result;
}

export function readImportPayload(raw: unknown): ImportPayload | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const situations = readCatalog(source.situations, parseSituation);
  const softs = readCatalog(source.softs, parseSoft);
  const phrases = readCatalog(source.phrases, parsePhrase);
  if (!situations || !softs || !phrases) return null;

  const payload: ImportPayload = {};
  if (situations.length) {
    payload.situations = situations;
  }
  if (softs.length) {
    payload.softs = softs;
  }
  if (phrases.length) {
    payload.phrases = phrases;
  }
  return hasAnyData(payload) ? payload : null;
}
