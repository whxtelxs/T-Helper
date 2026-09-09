import { useEffect, useRef, useState } from "preact/hooks";
import { openExternal } from "../lib/openExternal";
import { toast } from "../toast/store";
import { checkForUpdate, type UpdateNotice } from "./check";
import { isOnline, readAppVersion, RELEASES_PAGE_URL, runWhenIdle } from "./github";
import { cachedRelease, checkIsDue, dismissUpdate, shouldPrompt } from "./store";
import { installVelopack, listenUpdateProgress } from "./velopack";

export function useAppUpdate() {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const busyRef = useRef(false);
  const noticeRef = useRef<UpdateNotice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const canPublish = () => !controller.signal.aborted && !busyRef.current;
    let running = false;
    let lastAttempt = 0;
    const run = async (force = false) => {
      if (running || busyRef.current || controller.signal.aborted) return;
      const cached = cachedRelease();
      const needsReminder = cached && shouldPrompt(cached.version) && !noticeRef.current;
      if (!force && !checkIsDue() && !needsReminder) return;
      if (Date.now() - lastAttempt < 5 * 60 * 1000) return;
      running = true;
      if (isOnline()) lastAttempt = Date.now();
      try {
        const current = await readAppVersion();
        if (!current) return;
        const next = await checkForUpdate(current, controller.signal);
        if (canPublish()) {
          noticeRef.current = next;
          setNotice(next);
          setFailed(false);
        }
      } catch (error) {
        console.error("Ошибка проверки обновлений", error);
      } finally {
        running = false;
      }
    };
    const cancelIdle = runWhenIdle(() => {
      void run(true);
    });
    const online = () => {
      lastAttempt = 0;
      void run(true);
    };
    const timer = window.setInterval(() => {
      void run();
    }, 60_000);
    window.addEventListener("online", online);
    return () => {
      cancelIdle();
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, []);

  const postpone = () => {
    if (busyRef.current || !notice) return;
    dismissUpdate(notice.release.version);
    noticeRef.current = null;
    setNotice(null);
  };
  const goToRelease = () => {
    void openExternal(notice?.release.url ?? RELEASES_PAGE_URL);
    postpone();
  };
  const apply = async () => {
    if (busyRef.current || !notice) return;
    if (!notice.canApply) {
      goToRelease();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    setProgress(0);
    let stop: () => void = () => undefined;
    try {
      stop = await listenUpdateProgress((percent) => {
        setProgress(Math.max(0, Math.min(100, percent)));
      });
      const result = await installVelopack(notice.release.version);
      if (result === "ok") {
        noticeRef.current = null;
        setNotice(null);
        return;
      }
      setFailed(true);
      toast.error(
        result === "save"
          ? "Перезапуск отменён: не удалось сохранить изменения. Проверьте свободное место на диске."
          : "Не удалось установить обновление. Повторите попытку или откройте страницу релиза.",
      );
    } catch {
      setFailed(true);
      toast.error("Не удалось начать обновление");
    } finally {
      stop();
      busyRef.current = false;
      setBusy(false);
      setProgress(null);
    }
  };
  return { notice, busy, progress, failed, postpone, goToRelease, apply };
}
