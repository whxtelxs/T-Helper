import { AutoTextarea } from "../components/AutoTextarea";
import { CategoryField } from "../components/CategoryField";
import { useStore } from "../hooks/useStore";
import { situationStore, type SituationDraft } from "./store";

type SituationFormProps = {
  value: SituationDraft;
  onChange: (next: SituationDraft) => void;
};

export function SituationForm({ value, onChange }: SituationFormProps) {
  useStore(situationStore);

  return (
    <>
      <CategoryField
        id="situation-category"
        value={value.category}
        categories={situationStore.getCategories()}
        onChange={(category) => onChange({ ...value, category })}
      />
      <div class="modal-field">
        <label for="situation-client-wants">Клиент говорит</label>
        <AutoTextarea
          id="situation-client-wants"
          value={value.clientWants}
          onInput={(clientWants) => onChange({ ...value, clientWants })}
        />
      </div>
      <div class="modal-field">
        <label for="situation-use-script">Используй</label>
        <input
          id="situation-use-script"
          type="text"
          value={value.useScript}
          onInput={(event) =>
            onChange({ ...value, useScript: event.currentTarget.value })
          }
        />
      </div>
    </>
  );
}
