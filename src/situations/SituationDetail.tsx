import { useState } from "preact/hooks";
import { CatalogDetail, CatalogPlaceholder, InfoBlock } from "../catalog/CatalogDetail";
import { CopyButton } from "../components/CopyButton";
import { useStore } from "../hooks/useStore";
import { useNav } from "../navigation/NavProvider";
import { SituationForm } from "./SituationForm";
import {
  emptySituationDraft,
  isSituationDraftValid,
  situationStore,
  toSituationDraft,
} from "./store";

export function SituationDetail({ id }: { id: string }) {
  const { back } = useNav();
  const situations = useStore(situationStore);
  const [draft, setDraft] = useState(emptySituationDraft);
  const situation = situations.find((item) => item.id === id);

  if (!situation) {
    return <CatalogPlaceholder>Ситуация не найдена</CatalogPlaceholder>;
  }

  return (
    <CatalogDetail
      editTitle="Изменить ситуацию"
      deleteTitle="Удалить ситуацию?"
      form={<SituationForm value={draft} onChange={setDraft} />}
      canSave={isSituationDraftValid(draft)}
      onEditStart={() => setDraft(toSituationDraft(situation))}
      onSave={() => situationStore.update(situation.id, draft)}
      onDelete={() => {
        situationStore.remove(situation.id);
        back();
      }}
      actions={<CopyButton text={situation.useScript} />}
    >
      <InfoBlock label="Категория:">{situation.category}</InfoBlock>
      <InfoBlock label="Клиент говорит:">{situation.clientWants}</InfoBlock>
      <InfoBlock label="Используй:">{situation.useScript}</InfoBlock>
    </CatalogDetail>
  );
}
