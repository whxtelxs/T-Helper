import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render } from "preact";
import { useRef } from "preact/hooks";
import { act } from "preact/test-utils";
import { useEscapeKey } from "../src/hooks/useDismiss";
import { useModalFocus } from "../src/hooks/useModalFocus";

let host: HTMLDivElement;
let app: HTMLDivElement;
let trigger: HTMLButtonElement;

beforeEach(() => {
  app = document.createElement("div");
  app.id = "root";
  app.inert = false;
  trigger = document.createElement("button");
  app.append(trigger);
  host = document.createElement("div");
  document.body.append(app, host);
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue({
    length: 1,
    item: () => new DOMRect(0, 0, 20, 20),
    [Symbol.iterator]: () => [new DOMRect(0, 0, 20, 20)].values(),
    0: new DOMRect(0, 0, 20, 20),
  });
  trigger.focus();
});
afterEach(async () => {
  await act(() => render(null, host));
  host.remove();
  app.remove();
});

function Dialog({ open }: { open: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useModalFocus(open, root);
  return open ? (
    <div ref={root} tabIndex={-1}>
      <input aria-label="Первое поле" />
      <button disabled>Недоступно</button>
      <button>Готово</button>
    </div>
  ) : null;
}

it("focuses the dialog, wraps Tab and restores focus to its trigger", async () => {
  await act(() => render(<Dialog open />, host));
  const first = host.querySelector("input");
  const last = host.querySelector("button:not(:disabled)");
  expect(document.activeElement).toBe(first);
  expect(app.inert).toBe(true);
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, cancelable: true }),
  );
  expect(document.activeElement).toBe(last);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
  expect(document.activeElement).toBe(first);
  await act(() => render(<Dialog open={false} />, host));
  expect(app.inert).toBe(false);
  expect(document.activeElement).toBe(trigger);
});

function EscapeLayer({ enabled, close }: { enabled: boolean; close: () => void }) {
  useEscapeKey(enabled, close);
  return null;
}

it("dismisses only the most recently opened layer", async () => {
  const modal = vi.fn();
  const popup = vi.fn();
  await act(() =>
    render(
      <>
        <EscapeLayer enabled close={modal} />
        <EscapeLayer enabled={false} close={popup} />
      </>,
      host,
    ),
  );
  await act(() =>
    render(
      <>
        <EscapeLayer enabled close={modal} />
        <EscapeLayer enabled close={popup} />
      </>,
      host,
    ),
  );
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
  );
  expect(popup).toHaveBeenCalledOnce();
  expect(modal).not.toHaveBeenCalled();
  await act(() =>
    render(
      <>
        <EscapeLayer enabled close={modal} />
        <EscapeLayer enabled={false} close={popup} />
      </>,
      host,
    ),
  );
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", cancelable: true }),
  );
  expect(modal).toHaveBeenCalledOnce();
});
