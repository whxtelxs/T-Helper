import { CatalogList } from "../catalog/CatalogList";
import type { Phrase } from "../data/schema";
import { pickGenderedText } from "../lib/gender";
import { useNav } from "../navigation/NavProvider";
import { useOperatorGender } from "../settings/useOperatorGender";
import { PhraseForm } from "./PhraseForm";
import { emptyPhraseDraft, isPhraseDraftValid, phraseStore } from "./store";

function matches(item: Phrase, query: string) {
  return (
    !query ||
    item.text.male.toLowerCase().includes(query) ||
    item.text.female.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );
}

export function PhrasesList() {
  const { push } = useNav();
  const gender = useOperatorGender();

  return (
    <CatalogList
      store={phraseStore}
      addTitle="Новая фраза"
      deleteTitle="Удалить фразу?"
      title={(item) => pickGenderedText(item.text, gender)}
      matches={matches}
      emptyDraft={emptyPhraseDraft}
      isDraftValid={isPhraseDraftValid}
      Form={PhraseForm}
      onOpen={(id) => push({ name: "phrase", id })}
    />
  );
}
