import type { ComponentChildren } from "preact";
import { useErrorBoundary, useState } from "preact/hooks";
import { flushStoredWrites } from "../lib/storage";

export function AppBoundary({ children }: { children: ComponentChildren }) {
  const error: unknown = useErrorBoundary((cause) =>
    console.error("Ошибка интерфейса", cause),
  )[0];
  const [message, setMessage] = useState(
    "Не удалось отобразить приложение. Перезапустите интерфейс.",
  );
  const [busy, setBusy] = useState(false);
  if (!error) return children;
  const recover = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await flushStoredWrites();
      location.reload();
    } catch {
      setMessage(
        "Не удалось сохранить изменения. Освободите место на диске и повторите попытку.",
      );
      setBusy(false);
    }
  };
  return (
    <section class="app-recovery" role="alert">
      <h1>Ошибка приложения</h1>
      <p>{message}</p>
      <button type="button" disabled={busy} onClick={() => void recover()}>
        Перезапустить
      </button>
    </section>
  );
}
