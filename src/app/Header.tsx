import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { motion, useReducedMotion } from "motion/react";
import {
  IconChevronLeft,
  IconMenu,
  IconNotepad,
  IconPlus,
  IconSearch,
} from "../components/icons";
import { useDismiss } from "../hooks/useDismiss";
import { EASE_OUT } from "../lib/motion";
import { useNav } from "../navigation/NavProvider";
import type { Route } from "../navigation/routes";
import { addClient } from "../notepad/store";
import { useSearch } from "../search/SearchProvider";
import { toast } from "../toast/store";
import "./Header.css";

type HeaderAction = {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
};

export function Header({ route }: { route: Route }) {
  const { back, push } = useNav();

  const notepadAction: HeaderAction = {
    label: "Блокнот",
    icon: <IconNotepad />,
    onClick: () => push({ name: "notepad" }),
  };

  switch (route.name) {
    case "menu":
      return <BarHeader title="Меню" onBack={back} />;
    case "calculator":
      return <BarHeader title="Калькулятор" onBack={back} action={notepadAction} />;
    case "notepad":
      return (
        <BarHeader
          title="Блокнот"
          onBack={back}
          action={{
            label: "Добавить клиента",
            icon: <IconPlus />,
            onClick: () => {
              addClient();
              toast.success("Клиент добавлен");
            },
          }}
        />
      );
    case "situation":
      return <BarHeader title="Ситуации" onBack={back} action={notepadAction} />;
    case "soft":
      return <BarHeader title="Софты" onBack={back} action={notepadAction} />;
    case "phrase":
      return <BarHeader title="Фразы" onBack={back} action={notepadAction} />;
    default:
      return <SectionHeader />;
  }
}

function SectionHeader() {
  const { push } = useNav();
  const { query, focused, setQuery, setFocused } = useSearch();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const expanded = focused || query.length > 0;

  const closeSearch = () => {
    setFocused(false);
    inputRef.current?.blur();
  };

  useDismiss(focused, closeSearch, searchRef);

  useEffect(() => {
    if (focused) {
      inputRef.current?.focus();
    }
  }, [focused]);

  return (
    <header class="header">
      <button
        type="button"
        class="icon-btn"
        aria-label="Меню"
        onClick={() => push({ name: "menu" })}
      >
        <IconMenu />
      </button>

      <motion.div
        ref={searchRef}
        class={expanded ? "search search--open" : "search"}
        initial={false}
        animate={{ flexGrow: expanded ? 1 : 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.32, ease: EASE_OUT }}
        role={expanded ? undefined : "button"}
        tabIndex={expanded ? undefined : 0}
        onClick={(event) => {
          if (expanded) {
            if (!query && event.target !== inputRef.current) {
              closeSearch();
            }
            return;
          }
          setFocused(true);
        }}
        onKeyDown={(event) => {
          if (!expanded && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setFocused(true);
          }
        }}
      >
        <IconSearch class="search-icon" />
        <span class="search-label">Поиск</span>
        <input
          ref={inputRef}
          class="search-input"
          type="search"
          placeholder="Поиск"
          aria-label="Поиск"
          value={query}
          onFocus={() => setFocused(true)}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      </motion.div>

      <button
        type="button"
        class="icon-btn"
        aria-label="Блокнот"
        onClick={() => push({ name: "notepad" })}
      >
        <IconNotepad />
      </button>
    </header>
  );
}

function BarHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: HeaderAction;
}) {
  return (
    <header class="header header--bar">
      <button type="button" class="back-btn" onClick={onBack}>
        <IconChevronLeft />
        Назад
      </button>
      <div class="screen-title">{title}</div>
      {action ? (
        <button
          type="button"
          class="icon-btn"
          aria-label={action.label}
          onClick={action.onClick}
        >
          {action.icon}
        </button>
      ) : (
        <div class="header-spacer" aria-hidden="true" />
      )}
    </header>
  );
}
