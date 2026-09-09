export type OperatorGender = "male" | "female";

export type GenderedText = {
  male: string;
  female: string;
};

export const GENDER_LABELS: Record<OperatorGender, string> = {
  male: "Мужчина",
  female: "Девушка",
};

export function emptyGenderedText(): GenderedText {
  return { male: "", female: "" };
}

export function trimGenderedText(text: GenderedText): GenderedText {
  return { male: text.male.trim(), female: text.female.trim() };
}

export function hasGenderedText(text: GenderedText): boolean {
  return Boolean(text.male.trim() || text.female.trim());
}

export function pickGenderedText(text: GenderedText, gender: OperatorGender): string {
  const preferred = text[gender].trim();
  return preferred || text[gender === "male" ? "female" : "male"].trim();
}

export function parseGenderedText(value: unknown): GenderedText | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? { male: trimmed, female: trimmed } : null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { male, female } = value as Record<string, unknown>;
  if (typeof male !== "string" || typeof female !== "string") {
    return null;
  }
  return { male, female };
}

export function splitParagraphs(raw: string): string[] {
  return raw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function joinParagraphs(paragraphs: readonly string[]): string {
  return paragraphs.join("\n\n");
}

export function zipGenderedParagraphs(
  maleRaw: string,
  femaleRaw: string,
): GenderedText[] {
  const male = splitParagraphs(maleRaw);
  const female = splitParagraphs(femaleRaw);

  return Array.from({ length: Math.max(male.length, female.length) }, (_, index) => ({
    male: male[index] ?? female[index] ?? "",
    female: female[index] ?? male[index] ?? "",
  })).filter(hasGenderedText);
}

export function splitGenderedParagraphs(paragraphs: readonly GenderedText[]) {
  return {
    male: joinParagraphs(paragraphs.map((item) => item.male)),
    female: joinParagraphs(paragraphs.map((item) => item.female)),
  };
}
