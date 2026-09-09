import type { JSX } from "preact";
import type { ToastKind } from "./store";

const SHAPES: Record<ToastKind, JSX.Element> = {
  success: <path d="M3.5 8.2L6.4 11.1L12.5 4.9" stroke-width="1.6" />,
  error: (
    <>
      <circle cx="8" cy="8" r="5.75" stroke-width="1.4" />
      <path d="M8 5.2V8.6M8 10.8H8.01" stroke-width="1.6" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="5.75" stroke-width="1.4" />
      <path d="M8 7.1V10.7M8 5.3H8.01" stroke-width="1.6" />
    </>
  ),
};

export function ToastIcon({ kind }: { kind: ToastKind }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {SHAPES[kind]}
    </svg>
  );
}
