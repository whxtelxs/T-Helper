import { createCatalogStore } from "../data/catalogStore";
import { parseSoft, type Soft } from "../data/schema";
import { splitGenderedParagraphs, zipGenderedParagraphs } from "../lib/gender";

export type SoftDraft = {
  category: string;
  situation: string;
  male: string;
  female: string;
};

export const softStore = createCatalogStore<Soft, SoftDraft>({
  key: "t-helper-softs-v2",
  legacyKeys: ["t-helper-softs-v1"],
  parse: parseSoft,
  normalize: (draft) => ({
    category: draft.category.trim(),
    situation: draft.situation.trim(),
    phrases: zipGenderedParagraphs(draft.male, draft.female),
  }),
});

export function emptySoftDraft(): SoftDraft {
  return { category: "", situation: "", male: "", female: "" };
}

export function toSoftDraft(item: Soft): SoftDraft {
  return {
    category: item.category,
    situation: item.situation,
    ...splitGenderedParagraphs(item.phrases),
  };
}

export function isSoftDraftValid(draft: SoftDraft): boolean {
  return Boolean(
    draft.category.trim() &&
    draft.situation.trim() &&
    zipGenderedParagraphs(draft.male, draft.female).length > 0,
  );
}
