import { createCatalogStore } from "../data/catalogStore";
import { parseSituation, type Situation } from "../data/schema";

export type SituationDraft = {
  category: string;
  clientWants: string;
  useScript: string;
};

export const situationStore = createCatalogStore<Situation, SituationDraft>({
  key: "t-helper-situations-v3",
  parse: parseSituation,
  normalize: (draft) => ({
    category: draft.category.trim(),
    clientWants: draft.clientWants.trim(),
    useScript: draft.useScript.trim(),
  }),
});

export function emptySituationDraft(): SituationDraft {
  return { category: "", clientWants: "", useScript: "" };
}

export function toSituationDraft(item: Situation): SituationDraft {
  return {
    category: item.category,
    clientWants: item.clientWants,
    useScript: item.useScript,
  };
}

export function isSituationDraftValid(draft: SituationDraft): boolean {
  return Boolean(
    draft.category.trim() && draft.clientWants.trim() && draft.useScript.trim(),
  );
}
