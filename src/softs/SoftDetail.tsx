import { useState } from "preact/hooks";
import { CatalogDetail, CatalogPlaceholder, InfoBlock } from "../catalog/CatalogDetail";
import { CopyButton } from "../components/CopyButton";
import { useStore } from "../hooks/useStore";
import { pickGenderedText } from "../lib/gender";
import { useNav } from "../navigation/NavProvider";
import { useOperatorGender } from "../settings/useOperatorGender";
import { SoftForm } from "./SoftForm";
import { emptySoftDraft, isSoftDraftValid, softStore, toSoftDraft } from "./store";

export function SoftDetail({ id }: { id: string }) {
  const { back } = useNav();
  const gender = useOperatorGender();
  const softs = useStore(softStore);
  const [draft, setDraft] = useState(emptySoftDraft);
  const soft = softs.find((item) => item.id === id);

  if (!soft) {
    return <CatalogPlaceholder>Софт не найден</CatalogPlaceholder>;
  }

  return (
    <CatalogDetail
      editTitle="Изменить софт"
      deleteTitle="Удалить софт?"
      form={<SoftForm value={draft} onChange={setDraft} />}
      canSave={isSoftDraftValid(draft)}
      onEditStart={() => setDraft(toSoftDraft(soft))}
      onSave={() => softStore.update(soft.id, draft)}
      onDelete={() => {
        softStore.remove(soft.id);
        back();
      }}
    >
      <InfoBlock label="Категория:">{soft.category}</InfoBlock>
      <InfoBlock label="Ситуация:">{soft.situation}</InfoBlock>
      {soft.phrases.map((phrase, index) => {
        const text = pickGenderedText(phrase, gender);
        return (
          <div key={`${soft.id}-${index}`} class="info-block">
            <div class="info-label">Фраза {index + 1}:</div>
            <div class="info-text">{text}</div>
            <CopyButton text={text} block />
          </div>
        );
      })}
    </CatalogDetail>
  );
}
