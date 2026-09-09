import { CatalogList } from "../catalog/CatalogList";
import type { Soft } from "../data/schema";
import { useNav } from "../navigation/NavProvider";
import { SoftForm } from "./SoftForm";
import { emptySoftDraft, isSoftDraftValid, softStore } from "./store";

function matches(item: Soft, query: string) {
  return (
    !query ||
    item.situation.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    item.phrases.some(
      (phrase) =>
        phrase.male.toLowerCase().includes(query) ||
        phrase.female.toLowerCase().includes(query),
    )
  );
}

export function SoftsList() {
  const { push } = useNav();

  return (
    <CatalogList
      store={softStore}
      addTitle="Новый софт"
      deleteTitle="Удалить софт?"
      title={(item) => item.situation}
      matches={matches}
      emptyDraft={emptySoftDraft}
      isDraftValid={isSoftDraftValid}
      Form={SoftForm}
      onOpen={(id) => push({ name: "soft", id })}
    />
  );
}
