import { AutoTextarea } from "../components/AutoTextarea";
import { CategoryField } from "../components/CategoryField";
import { useStore } from "../hooks/useStore";
import { softStore, type SoftDraft } from "./store";

type SoftFormProps = {
  value: SoftDraft;
  onChange: (next: SoftDraft) => void;
};

export function SoftForm({ value, onChange }: SoftFormProps) {
  useStore(softStore);

  return (
    <>
      <CategoryField
        id="soft-category"
        value={value.category}
        categories={softStore.getCategories()}
        onChange={(category) => onChange({ ...value, category })}
      />
      <div class="modal-field">
        <label for="soft-situation">Ситуация</label>
        <AutoTextarea
          id="soft-situation"
          value={value.situation}
          onInput={(situation) => onChange({ ...value, situation })}
        />
      </div>
      <div class="modal-field">
        <label for="soft-phrases-male">Фразы · мужчина</label>
        <AutoTextarea
          id="soft-phrases-male"
          class="textarea-tall"
          value={value.male}
          onInput={(male) => onChange({ ...value, male })}
        />
        <p class="field-hint">Каждая фраза через пустую строку</p>
      </div>
      <div class="modal-field">
        <label for="soft-phrases-female">Фразы · девушка</label>
        <AutoTextarea
          id="soft-phrases-female"
          class="textarea-tall"
          value={value.female}
          onInput={(female) => onChange({ ...value, female })}
        />
        <p class="field-hint">Каждая фраза через пустую строку</p>
      </div>
    </>
  );
}
