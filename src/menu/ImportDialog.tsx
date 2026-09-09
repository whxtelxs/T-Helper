import { useEffect } from "preact/hooks";
import { Modal, ModalActions } from "../components/Modal";
import {
  cancelImport,
  confirmImport,
  pendingImport,
  setImportSelection,
} from "../data/importStore";
import { watchOpenedFiles } from "../data/openedFiles";
import { emptySelection, hasSelection, selectionFrom } from "../data/transfer";
import { useStore } from "../hooks/useStore";
import { SectionPicker } from "./SectionPicker";

export function ImportDialog() {
  const pending = useStore(pendingImport);

  useEffect(watchOpenedFiles, []);

  return (
    <Modal open={pending !== null} title="Импорт данных" onClose={cancelImport}>
      <div class="modal-body">
        <p class="modal-text">Выберите разделы для импорта</p>
        <SectionPicker
          selection={pending?.selection ?? emptySelection()}
          available={pending ? selectionFrom(pending.payload) : emptySelection()}
          onChange={setImportSelection}
        />
      </div>
      <ModalActions
        onCancel={cancelImport}
        confirmLabel={pending?.saving ? "Сохранение..." : "Импортировать"}
        confirmDisabled={!pending || pending.saving || !hasSelection(pending.selection)}
        cancelDisabled={pending?.saving}
        onConfirm={() => void confirmImport()}
      />
    </Modal>
  );
}
