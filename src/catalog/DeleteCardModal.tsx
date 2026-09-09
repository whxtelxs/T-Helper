import { ConfirmModal } from "../components/Modal";

type DeleteCardModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCardModal({
  open,
  title,
  onClose,
  onConfirm,
}: DeleteCardModalProps) {
  return (
    <ConfirmModal
      open={open}
      title={title}
      description="Карточка будет удалена без возможности восстановления."
      confirmLabel="Удалить"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
