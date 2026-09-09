import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext, useLayoutEffect, useMemo, useState } from "preact/hooks";
import { useNav } from "../navigation/NavProvider";
import { routeKey } from "../navigation/routes";

type SearchContextValue = {
  query: string;
  focused: boolean;
  setQuery: (query: string) => void;
  setFocused: (focused: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ComponentChildren }) {
  const { route } = useNav();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const key = routeKey(route);

  useLayoutEffect(() => setFocused(false), [key]);

  const value = useMemo<SearchContextValue>(
    () => ({ query, focused, setQuery, setFocused }),
    [query, focused],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext);
  if (!value) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return value;
}
