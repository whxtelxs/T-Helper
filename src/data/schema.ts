import { parseGenderedText, type GenderedText } from "../lib/gender";

export type CatalogEntry = {
  id: string;
  category: string;
  pinned: boolean;
};

export type Situation = CatalogEntry & {
  clientWants: string;
  useScript: string;
};

export type Soft = CatalogEntry & {
  situation: string;
  phrases: GenderedText[];
};

export type Phrase = CatalogEntry & {
  text: GenderedText;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCategory(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseSituation(raw: unknown): Situation | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, clientWants, useScript } = raw;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof clientWants !== "string" ||
    typeof useScript !== "string"
  ) {
    return null;
  }
  return {
    id,
    category: readCategory(raw.category),
    clientWants,
    useScript,
    pinned: raw.pinned === true,
  };
}

export function parseSoft(raw: unknown): Soft | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, situation, phrases } = raw;
  if (
    typeof id !== "string" ||
    !id.trim() ||
    typeof situation !== "string" ||
    !Array.isArray(phrases)
  ) {
    return null;
  }
  const parsed = phrases
    .map(parseGenderedText)
    .filter((phrase): phrase is GenderedText => phrase !== null);
  if (parsed.length === 0 || parsed.length !== phrases.length) {
    return null;
  }
  return {
    id,
    category: readCategory(raw.category),
    situation,
    phrases: parsed,
    pinned: raw.pinned === true,
  };
}

export function parsePhrase(raw: unknown): Phrase | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id } = raw;
  const text = parseGenderedText(raw.text);
  if (typeof id !== "string" || !id.trim() || !text) {
    return null;
  }
  return {
    id,
    category: readCategory(raw.category),
    text,
    pinned: raw.pinned === true,
  };
}
