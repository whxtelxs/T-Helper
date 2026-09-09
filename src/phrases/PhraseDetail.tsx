import { useState } from "preact/hooks";
import { CatalogDetail, CatalogPlaceholder, InfoBlock } from "../catalog/CatalogDetail";
import { CopyButton } from "../components/CopyButton";
import { useStore } from "../hooks/useStore";
import { pickGenderedText } from "../lib/gender";
import { useNav } from "../navigation/NavProvider";
import { useOperatorGender } from "../settings/useOperatorGender";
import { PhraseForm } from "./PhraseForm";
import {
  emptyPhraseDraft,
  isPhraseDraftValid,
  phraseStore,
  toPhraseDraft,
} from "./store";

export function PhraseDetail({ id }: { id: string }) {
  const { back } = useNav();
  const gender = useOperatorGender();
  const phrases = useStore(phraseStore);
  const [draft, setDraft] = useState(emptyPhraseDraft);
  const phrase = phrases.find((item) => item.id === id);

  if (!phrase) {
    return <CatalogPlaceholder>Фраза не найдена</CatalogPlaceholder>;
  }

  const text = pickGenderedText(phrase.text, gender);

  return (
    <CatalogDetail
      editTitle="Изменить фразу"
      deleteTitle="Удалить фразу?"
      form={<PhraseForm value={draft} onChange={setDraft} />}
      canSave={isPhraseDraftValid(draft)}
      onEditStart={() => setDraft(toPhraseDraft(phrase))}
      onSave={() => phraseStore.update(phrase.id, draft)}
      onDelete={() => {
        phraseStore.remove(phrase.id);
        back();
      }}
      actions={<CopyButton text={text} />}
    >
      <InfoBlock label="Категория:">{phrase.category}</InfoBlock>
      <InfoBlock label="Фраза:">{text}</InfoBlock>
    </CatalogDetail>
  );
}
