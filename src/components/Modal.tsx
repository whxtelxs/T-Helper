import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useRef } from "preact/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useEscapeKey } from "../hooks/useDismiss";
import { useModalFocus } from "../hooks/useModalFocus";
import { OverlayHost } from "./OverlayHost";
import { POPOVER_MOTION } from "../lib/motion";
import "./Modal.css";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
  const root = useRef<HTMLDivElement>(null);
  useEscapeKey(open, onClose);
  useModalFocus(open, root);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={root}
          tabIndex={-1}
          class="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={POPOVER_MOTION.transition}
        >
          <div class="modal-backdrop" onClick={onClose} />
          <motion.div
            class="modal-panel hide-scrollbar"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            {...POPOVER_MOTION}
          >
            <h2 class="modal-title">{title}</h2>
            <OverlayHost.Provider value={root}>{children}</OverlayHost.Provider>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

type ModalActionsProps = {
  onCancel: () => void;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
  confirmVariant?: "primary" | "danger";
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
};

export function ModalActions({
  onCancel,
  cancelLabel = "Отмена",
  confirmLabel,
  onConfirm,
  confirmVariant = "primary",
  confirmDisabled = false,
  cancelDisabled = false,
}: ModalActionsProps) {
  return (
    <div class="modal-actions">
      <button type="button" disabled={cancelDisabled} onClick={onCancel}>
        {cancelLabel}
      </button>
      <button
        type="button"
        class={`modal-${confirmVariant}`}
        disabled={confirmDisabled}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p class="modal-text">{description}</p>
      <ModalActions
        onCancel={onClose}
        confirmLabel={confirmLabel}
        confirmVariant="danger"
        onConfirm={onConfirm}
      />
    </Modal>
  );
}
