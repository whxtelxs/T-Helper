type IconProps = {
  class?: string;
};

function iconClass(extra?: string) {
  return extra ? `icon ${extra}` : "icon";
}

export function IconSearch({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="8.625" cy="8.625" r="7.125" />
      <path class="icon-secondary" d="M16.5 16.5L15 15" />
    </svg>
  );
}

export function IconMenu({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="13.156" cy="4.388" r="2.22" />
      <circle cx="4.845" cy="4.388" r="2.22" />
      <circle class="icon-secondary" cx="13.156" cy="13.612" r="2.22" />
      <circle cx="4.845" cy="13.612" r="2.22" />
    </svg>
  );
}

export function IconNotepad({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6.1875V13.5C15 15.75 13.6575 16.5 12 16.5H6C4.3425 16.5 3 15.75 3 13.5V6.1875C3 3.75 4.3425 3.1875 6 3.1875C6 3.6525 6.18748 4.0725 6.49498 4.38C6.80248 4.6875 7.2225 4.875 7.6875 4.875H10.3125C11.2425 4.875 12 4.1175 12 3.1875C13.6575 3.1875 15 3.75 15 6.1875Z" />
      <path d="M12 3.1875C12 4.1175 11.2425 4.875 10.3125 4.875H7.6875C7.2225 4.875 6.80248 4.6875 6.49498 4.38C6.18748 4.0725 6 3.6525 6 3.1875C6 2.2575 6.7575 1.5 7.6875 1.5H10.3125C10.7775 1.5 11.1975 1.6875 11.505 1.995C11.8125 2.3025 12 2.7225 12 3.1875Z" />
      <path class="icon-secondary" d="M6 9.75H9" />
      <path class="icon-secondary" d="M6 12.75H12" />
    </svg>
  );
}

export function IconPlus({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 9H13.5" />
      <path d="M9 13.5V4.5" />
    </svg>
  );
}

export function IconChevronLeft({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M11.2489 14.9401L6.35891 10.0501C5.78141 9.47257 5.78141 8.52757 6.35891 7.95007L11.2489 3.06006" />
    </svg>
  );
}

export function IconChevronRight({ class: className }: IconProps) {
  return (
    <svg
      class={iconClass(className)}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6.75113 3.05993L11.6411 7.94993C12.2186 8.52743 12.2186 9.47243 11.6411 10.0499L6.75112 14.9399" />
    </svg>
  );
}
