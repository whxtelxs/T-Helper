import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Modal, ModalActions } from "../components/Modal";
import { ScrollFade } from "../components/ScrollFade";
import { toast } from "../toast/store";
import { DeleteCardModal } from "./DeleteCardModal";
import "./catalog.css";

type CatalogDetailProps = {
  children: ComponentChildren;
  actions?: ComponentChildren;
  editTitle: string;
  deleteTitle: string;
  form: ComponentChildren;
  canSave: boolean;
  onEditStart: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function CatalogDetail({
  children,
  actions,
  editTitle,
  deleteTitle,
  form,
  canSave,
  onEditStart,
  onSave,
  onDelete,
}: CatalogDetailProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section class="catalog-detail">
      <ScrollFade>
        {children}
        <div class="detail-actions">
          {actions}
          <button
            type="button"
            class="action-btn"
            onClick={() => {
              onEditStart();
              setEditOpen(true);
            }}
          >
            Изменить
          </button>
          <button type="button" class="action-btn" onClick={() => setDeleteOpen(true)}>
            Удалить
          </button>
        </div>
      </ScrollFade>

      <Modal open={editOpen} title={editTitle} onClose={() => setEditOpen(false)}>
        {form}
        <ModalActions
          onCancel={() => setEditOpen(false)}
          confirmLabel="Сохранить"
          confirmDisabled={!canSave}
          onConfirm={() => {
            onSave();
            toast.success("Сохранено");
            setEditOpen(false);
          }}
        />
      </Modal>

      <DeleteCardModal
        open={deleteOpen}
        title={deleteTitle}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          onDelete();
          toast.success("Удалено");
        }}
      />
    </section>
  );
}

export function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ComponentChildren;
}) {
  return (
    <div class="info-block">
      <div class="info-label">{label}</div>
      <div class="info-text">{children}</div>
    </div>
  );
}

export function CatalogPlaceholder({ children }: { children: ComponentChildren }) {
  return (
    <section class="catalog-detail">
      <p class="catalog-empty">{children}</p>
    </section>
  );
}
