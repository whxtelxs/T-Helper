import { createCatalogStore } from "../data/catalogStore";
import { parsePhrase, type Phrase } from "../data/schema";
import {
  emptyGenderedText,
  hasGenderedText,
  trimGenderedText,
  type GenderedText,
} from "../lib/gender";

export type PhraseDraft = {
  category: string;
  text: GenderedText;
};

export const phraseStore = createCatalogStore<Phrase, PhraseDraft>({
  key: "t-helper-phrases-v2",
  legacyKeys: ["t-helper-phrases-v1"],
  parse: parsePhrase,
  normalize: (draft) => ({
    category: draft.category.trim(),
    text: trimGenderedText(draft.text),
  }),
});

export function emptyPhraseDraft(): PhraseDraft {
  return { category: "", text: emptyGenderedText() };
}

export function toPhraseDraft(item: Phrase): PhraseDraft {
  return { category: item.category, text: item.text };
}

export function isPhraseDraftValid(draft: PhraseDraft): boolean {
  return Boolean(draft.category.trim() && hasGenderedText(draft.text));
}
