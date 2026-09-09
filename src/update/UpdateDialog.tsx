import { useAppUpdate } from "./useAppUpdate";
import "./update.css";

export function UpdateDialog() {
  const { notice, busy, progress, failed, postpone, goToRelease, apply } = useAppUpdate();
  if (!notice) return null;
  return (
    <aside class="update-notice" aria-label="Обновление приложения">
      <p class="update-notice-title" role="status">
        {busy
          ? `Загрузка обновления… ${progress ?? 0}%`
          : `Доступна версия ${notice.release.version}`}
      </p>
      <p class="update-notice-hint">
        {busy
          ? "Можно продолжать работу. Перед перезапуском изменения будут сохранены."
          : notice.canApply
            ? "Установка перезапустит приложение."
            : "Скачайте новую версию со страницы релиза."}
      </p>
      {busy && (
        <progress
          class="update-progress"
          max={100}
          value={progress ?? undefined}
          aria-label="Загрузка обновления"
        />
      )}
      <div class="modal-actions">
        <button type="button" onClick={postpone} disabled={busy}>
          Напомнить завтра
        </button>
        <button
          type="button"
          class="modal-primary"
          disabled={busy}
          onClick={() => {
            void apply();
          }}
        >
          {busy
            ? "Устанавливаем…"
            : failed
              ? "Повторить"
              : notice.canApply
                ? "Обновить"
                : "Открыть релиз"}
        </button>
      </div>
      {failed && (
        <button type="button" class="update-release-link" onClick={goToRelease}>
          Открыть страницу релиза
        </button>
      )}
    </aside>
  );
}
