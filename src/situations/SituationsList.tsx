import { CatalogList } from "../catalog/CatalogList";
import type { Situation } from "../data/schema";
import { useNav } from "../navigation/NavProvider";
import { SituationForm } from "./SituationForm";
import { emptySituationDraft, isSituationDraftValid, situationStore } from "./store";

function matches(item: Situation, query: string) {
  return (
    !query ||
    item.clientWants.toLowerCase().includes(query) ||
    item.useScript.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );
}

export function SituationsList() {
  const { push } = useNav();

  return (
    <CatalogList
      store={situationStore}
      addTitle="Новая ситуация"
      deleteTitle="Удалить ситуацию?"
      title={(item) => item.clientWants}
      matches={matches}
      emptyDraft={emptySituationDraft}
      isDraftValid={isSituationDraftValid}
      Form={SituationForm}
      onOpen={(id) => push({ name: "situation", id })}
    />
  );
}
