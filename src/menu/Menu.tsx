import { useRef, useState } from "preact/hooks";
import { Modal, ModalActions } from "../components/Modal";
import { ScrollFade } from "../components/ScrollFade";
import { openImportFile } from "../data/importStore";
import { downloadThelp, THELP_EXTENSION } from "../data/thelp";
import { packInWorker } from "../data/parseInWorker";
import {
  emptySelection,
  hasAnyData,
  hasSelectedData,
  hasSelection,
  pickCatalogs,
  selectionFrom,
  type CatalogData,
  type CatalogSelection,
} from "../data/transfer";
import { useScrollEdges } from "../hooks/useScrollEdges";
import { useStore } from "../hooks/useStore";
import { GENDER_LABELS, type OperatorGender } from "../lib/gender";
import { flushStoredWrites } from "../lib/storage";
import { openExternal } from "../lib/openExternal";
import { useNav } from "../navigation/NavProvider";
import type { SectionName } from "../navigation/routes";
import { clearNotepad } from "../notepad/store";
import { phraseStore } from "../phrases/store";
import { setOperatorGender, setTheme, settingsStore } from "../settings/store";
import { THEME_LABELS, themeOriginFromEvent, type AppTheme } from "../settings/theme";
import { situationStore } from "../situations/store";
import { softStore } from "../softs/store";
import { toast } from "../toast/store";
import { SectionPicker } from "./SectionPicker";
import "./Menu.css";

const PROJECT_LINK =
  "https://my.tbank.ru/link/blog/2b7ace2b-65c9-453d-a031-f1bde5ed8e1d/";

const SECTIONS: readonly { id: SectionName; title: string; description: string }[] = [
  {
    id: "situations",
    title: "Ситуации",
    description: "Какие скрипты использовать, в разных ситуациях",
  },
  {
    id: "softs",
    title: "Софты",
    description: "Разные фразы для софтинга клиента",
  },
  {
    id: "phrases",
    title: "Фразы",
    description: "Готовый набор фраз, для быстрой отправки",
  },
];

type MenuModal =
  { type: "export"; selection: CatalogSelection } | { type: "reset" } | null;

function readCatalogData(): CatalogData {
  return {
    situations: situationStore.get(),
    softs: softStore.get(),
    phrases: phraseStore.get(),
  };
}

function exportFilename() {
  return `t-helper-${new Date().toISOString().slice(0, 10)}${THELP_EXTENSION}`;
}

export function Menu() {
  const { open, push, activeSection, route } = useNav();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollEdges = useScrollEdges(scrollRef);
  const { operatorGender, theme } = useStore(settingsStore);
  const [modal, setModal] = useState<MenuModal>(null);
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);
  const closeModal = () => {
    if (!runningRef.current) setModal(null);
  };

  const chooseGender = (gender: OperatorGender) => {
    if (gender !== operatorGender) {
      setOperatorGender(gender);
      toast.success(`Пол оператора: ${GENDER_LABELS[gender].toLowerCase()}`);
    }
  };

  const chooseTheme = (next: AppTheme, event: Event) => {
    if (next !== theme) {
      setTheme(next, themeOriginFromEvent(event));
      toast.success(`Тема: ${THEME_LABELS[next].toLowerCase()}`);
    }
  };

  const openExportModal = () => {
    const data = readCatalogData();
    if (!hasAnyData(data)) {
      toast.error("Нечего экспортировать");
      return;
    }
    setModal({ type: "export", selection: selectionFrom(data) });
  };

  const runExport = async (selection: CatalogSelection) => {
    if (runningRef.current) return;
    const data = readCatalogData();
    if (!hasSelectedData(selection, data)) {
      toast.error("В выбранных разделах нет данных");
      return;
    }
    runningRef.current = true;
    setBusy(true);
    try {
      downloadThelp(exportFilename(), await packInWorker(pickCatalogs(selection, data)));
      toast.success("Данные экспортированы");
      setModal(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось экспортировать данные",
      );
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  };

  const resetAll = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      situationStore.clear();
      softStore.clear();
      phraseStore.clear();
      clearNotepad();
      await flushStoredWrites();
      toast.success("Все данные удалены");
      setModal(null);
    } catch {
      toast.error("Не удалось сохранить сброс. Повторите попытку.");
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section class="menu-page">
      <ScrollFade bodyRef={scrollRef} class="menu-scroll">
        <div class="menu-stack">
          <section class="menu-section">
            <h2 class="menu-section-title">Разделы</h2>
            <div class="menu-section-body">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  class={
                    activeSection === section.id
                      ? "menu-item menu-item--active"
                      : "menu-item"
                  }
                  onClick={() => open({ name: section.id })}
                >
                  <span class="menu-item-title">{section.title}</span>
                  <span class="menu-item-desc">{section.description}</span>
                </button>
              ))}
              <button
                type="button"
                class={
                  route.name === "calculator"
                    ? "menu-item menu-item--active"
                    : "menu-item"
                }
                onClick={() => push({ name: "calculator" })}
              >
                <span class="menu-item-title">Калькулятор</span>
                <span class="menu-item-desc">Обычный счёт и проценты по сумме</span>
              </button>
            </div>
          </section>

          <section class="menu-section">
            <h2 class="menu-section-title">Настройки</h2>
            <div class="menu-section-body">
              <div class="menu-setting">
                <span class="menu-setting-label">Тема</span>
                <div class="menu-gender-options">
                  {(["dark", "light"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      class={
                        theme === item
                          ? "menu-gender-option menu-gender-option--on"
                          : "menu-gender-option"
                      }
                      aria-pressed={theme === item}
                      onClick={(event) => chooseTheme(item, event)}
                    >
                      {THEME_LABELS[item]}
                    </button>
                  ))}
                </div>
              </div>
              <div class="menu-setting">
                <span class="menu-setting-label">Пол оператора</span>
                <div class="menu-gender-options">
                  {(["male", "female"] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      class={
                        operatorGender === gender
                          ? "menu-gender-option menu-gender-option--on"
                          : "menu-gender-option"
                      }
                      aria-pressed={operatorGender === gender}
                      onClick={() => chooseGender(gender)}
                    >
                      {GENDER_LABELS[gender]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section class="menu-section">
            <h2 class="menu-section-title">Данные</h2>
            <div class="menu-section-body">
              <button type="button" class="settings-btn" onClick={openExportModal}>
                Экспорт данных
              </button>
              <button
                type="button"
                class="settings-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Импорт данных
              </button>
              <button
                type="button"
                class="settings-btn settings-btn--danger"
                onClick={() => setModal({ type: "reset" })}
              >
                Сбросить все данные
              </button>
            </div>
          </section>
        </div>
      </ScrollFade>

      <div class={scrollEdges.end ? "menu-footer menu-footer--fade" : "menu-footer"}>
        <button
          type="button"
          class="menu-item menu-item--link"
          onClick={() => void openExternal(PROJECT_LINK)}
        >
          <span class="menu-item-title">Майти</span>
          <span class="menu-item-desc">Линк проекта Т-Хелпер</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        class="settings-file"
        type="file"
        accept={THELP_EXTENSION}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) {
            void openImportFile(file);
          }
        }}
      />

      <Modal open={modal?.type === "export"} title="Экспорт данных" onClose={closeModal}>
        <div class="modal-body">
          <p class="modal-text">Выберите разделы для экспорта</p>
          <SectionPicker
            selection={modal?.type === "export" ? modal.selection : emptySelection()}
            available={selectionFrom(readCatalogData())}
            onChange={(selection) => setModal({ type: "export", selection })}
          />
        </div>
        <ModalActions
          onCancel={closeModal}
          cancelDisabled={busy}
          confirmLabel="Экспортировать"
          confirmDisabled={
            busy || modal?.type !== "export" || !hasSelection(modal.selection)
          }
          onConfirm={() => {
            if (modal?.type === "export") {
              void runExport(modal.selection);
            }
          }}
        />
      </Modal>

      <Modal
        open={modal?.type === "reset"}
        title="Сбросить все данные?"
        onClose={closeModal}
      >
        <p class="modal-text">
          Все ситуации, софты, фразы и записи блокнота будут удалены.
        </p>
        <ModalActions
          onCancel={closeModal}
          cancelDisabled={busy}
          confirmLabel="Сбросить"
          confirmVariant="danger"
          confirmDisabled={busy}
          onConfirm={() => void resetAll()}
        />
      </Modal>
    </section>
  );
}
