import { CATALOG_KEYS, CATALOG_LABELS, type CatalogSelection } from "../data/transfer";

type SectionPickerProps = {
  selection: CatalogSelection;
  available: CatalogSelection;
  onChange: (next: CatalogSelection) => void;
};

export function SectionPicker({ selection, available, onChange }: SectionPickerProps) {
  return (
    <div class="modal-options">
      {CATALOG_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          class={selection[key] ? "modal-option modal-option--on" : "modal-option"}
          disabled={!available[key]}
          onClick={() => onChange({ ...selection, [key]: !selection[key] })}
        >
          {CATALOG_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
