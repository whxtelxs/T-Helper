import { useEffect, useRef, useState } from "preact/hooks";
import { ContextMenu, ContextMenuItem, type MenuAnchor } from "../components/ContextMenu";
import { IconChevronLeft, IconChevronRight } from "../components/icons";
import { ScrollFade } from "../components/ScrollFade";
import { useScrollEdges } from "../hooks/useScrollEdges";
import { useStore } from "../hooks/useStore";
import { toast } from "../toast/store";
import {
  notepadStore,
  removeClient,
  renameClient,
  setActiveClient,
  setClientNote,
} from "./store";
import "./Notepad.css";

const PAGE_SCROLL_RATIO = 0.7;
const MIN_PAGE_SCROLL = 160;

export function Notepad() {
  const { clients, activeId } = useStore(notepadStore);
  const stripRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const renameRef = useRef<HTMLTextAreaElement>(null);
  const [anchor, setAnchor] = useState<(MenuAnchor & { clientId: string }) | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const active = clients.find((client) => client.id === activeId) ?? null;
  const stripEdges = useScrollEdges(stripRef, "x", clients.length);
  const noteEdges = useScrollEdges(noteRef, "y", active?.note);

  useEffect(() => {
    const strip = stripRef.current;
    const chip = strip?.querySelector<HTMLElement>(
      `[data-client-id="${CSS.escape(activeId)}"]`,
    );
    const maxScroll = strip ? strip.scrollWidth - strip.clientWidth : 0;
    if (!strip || !chip || maxScroll <= 1) {
      return;
    }
    strip.scrollTo({
      left: Math.min(
        maxScroll,
        Math.max(0, chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2),
      ),
      behavior: clients.length === 1 ? "auto" : "smooth",
    });
  }, [activeId, clients.length]);

  useEffect(() => {
    if (renamingId) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [renamingId]);

  const scrollByPage = (direction: -1 | 1) => {
    const strip = stripRef.current;
    strip?.scrollBy({
      left: direction * Math.max(strip.clientWidth * PAGE_SCROLL_RATIO, MIN_PAGE_SCROLL),
      behavior: "smooth",
    });
  };

  const startRename = (id: string, name: string) => {
    setRenameValue(name);
    setRenamingId(id);
  };

  const commitRename = () => {
    if (renamingId) {
      renameClient(renamingId, renameValue);
    }
    setRenamingId(null);
  };

  return (
    <section class="notepad">
      <div class="client-strip">
        <button
          type="button"
          class="icon-btn"
          aria-label="Листать влево"
          disabled={!stripEdges.start}
          onClick={() => scrollByPage(-1)}
        >
          <IconChevronLeft />
        </button>

        <ScrollFade
          axis="x"
          class="client-list"
          bodyRef={stripRef}
          refreshKey={clients.length}
        >
          {clients.map((client) => (
            <div
              key={client.id}
              data-client-id={client.id}
              class={
                client.id === activeId ? "client-chip client-chip--active" : "client-chip"
              }
              role="button"
              tabIndex={0}
              onClick={() => {
                if (renamingId !== client.id) {
                  setActiveClient(client.id);
                }
              }}
              onKeyDown={(event) => {
                if (renamingId === client.id) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveClient(client.id);
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setAnchor({
                  x: event.clientX,
                  y: event.clientY,
                  clientId: client.id,
                });
              }}
            >
              {renamingId === client.id ? (
                <textarea
                  ref={renameRef}
                  aria-label="Имя клиента"
                  class="client-rename"
                  rows={1}
                  wrap="off"
                  spellcheck={false}
                  value={renameValue}
                  onClick={(event) => event.stopPropagation()}
                  onInput={(event) =>
                    setRenameValue(event.currentTarget.value.replaceAll("\n", ""))
                  }
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setRenamingId(null);
                    }
                  }}
                />
              ) : (
                client.name
              )}
            </div>
          ))}
        </ScrollFade>

        <button
          type="button"
          class="icon-btn"
          aria-label="Листать вправо"
          disabled={!stripEdges.end}
          onClick={() => scrollByPage(1)}
        >
          <IconChevronRight />
        </button>
      </div>

      <label
        class={[
          "note",
          noteEdges.start && "note--fade-top",
          noteEdges.end && "note--fade-bottom",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <textarea
          ref={noteRef}
          aria-label="Заметки клиента"
          class="note-input hide-scrollbar"
          value={active?.note ?? ""}
          placeholder="Начните печатать..."
          disabled={!active}
          onInput={(event) => {
            if (active) {
              setClientNote(active.id, event.currentTarget.value);
            }
          }}
        />
      </label>

      <ContextMenu anchor={anchor} onClose={() => setAnchor(null)}>
        <ContextMenuItem
          disabled={anchor?.clientId === activeId}
          onClick={() => {
            if (anchor) {
              setActiveClient(anchor.clientId);
            }
            setAnchor(null);
          }}
        >
          Открыть
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            const client = clients.find((item) => item.id === anchor?.clientId);
            if (client) {
              startRename(client.id, client.name);
            }
            setAnchor(null);
          }}
        >
          Переименовать
        </ContextMenuItem>
        <ContextMenuItem
          danger
          disabled={clients.length <= 1}
          onClick={() => {
            if (anchor) {
              removeClient(anchor.clientId);
              toast.success("Клиент удалён");
            }
            setAnchor(null);
          }}
        >
          Удалить
        </ContextMenuItem>
      </ContextMenu>
    </section>
  );
}
