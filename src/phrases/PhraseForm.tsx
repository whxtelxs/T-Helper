import { AutoTextarea } from "../components/AutoTextarea";
import { CategoryField } from "../components/CategoryField";
import { useStore } from "../hooks/useStore";
import { phraseStore, type PhraseDraft } from "./store";

type PhraseFormProps = {
  value: PhraseDraft;
  onChange: (next: PhraseDraft) => void;
};

export function PhraseForm({ value, onChange }: PhraseFormProps) {
  useStore(phraseStore);

  return (
    <>
      <CategoryField
        id="phrase-category"
        value={value.category}
        categories={phraseStore.getCategories()}
        onChange={(category) => onChange({ ...value, category })}
      />
      <div class="modal-field">
        <label for="phrase-text-male">Фраза · мужчина</label>
        <AutoTextarea
          id="phrase-text-male"
          value={value.text.male}
          onInput={(male) => onChange({ ...value, text: { ...value.text, male } })}
        />
      </div>
      <div class="modal-field">
        <label for="phrase-text-female">Фраза · девушка</label>
        <AutoTextarea
          id="phrase-text-female"
          value={value.text.female}
          onInput={(female) => onChange({ ...value, text: { ...value.text, female } })}
        />
      </div>
    </>
  );
}
