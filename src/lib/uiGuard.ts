function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const field = target.closest("input, textarea");
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
    return false;
  }
  return !field.disabled && !field.readOnly;
}

function isInspectShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  if (event.key === "F12") {
    return true;
  }
  if (event.ctrlKey && event.shiftKey && (key === "i" || key === "j" || key === "c")) {
    return true;
  }
  if (event.metaKey && event.altKey && (key === "i" || key === "j" || key === "c")) {
    return true;
  }
  if (
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    (key === "u" || key === "s")
  ) {
    return true;
  }
  return false;
}

export function installUiGuard(): void {
  document.addEventListener("contextmenu", (event) => {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    if (!isEditableTarget(event.target)) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragover", (event) => event.preventDefault());
  document.addEventListener("drop", (event) => event.preventDefault());

  if (!import.meta.env.PROD) {
    return;
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (isInspectShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}
