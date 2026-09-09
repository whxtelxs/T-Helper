import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useMemo, useReducer } from "preact/hooks";
import { isSection, routeKey, type Route, type SectionName } from "./routes";

const ROOT_SECTION: SectionName = "situations";
const ROOT_ROUTE: Route = { name: ROOT_SECTION };

type NavState = {
  stack: Route[];
  direction: 1 | -1;
};

type NavAction =
  { type: "open"; route: Route } | { type: "push"; route: Route } | { type: "back" };

type NavContextValue = {
  route: Route;
  direction: 1 | -1;
  activeSection: SectionName;
  open: (route: Route) => void;
  push: (route: Route) => void;
  back: () => void;
};

const NavContext = createContext<NavContextValue | null>(null);

function currentRoute(stack: Route[]): Route {
  return stack[stack.length - 1] ?? ROOT_ROUTE;
}

function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "open":
      return { stack: [action.route], direction: 1 };
    case "push":
      return routeKey(currentRoute(state.stack)) === routeKey(action.route)
        ? state
        : { stack: [...state.stack, action.route], direction: 1 };
    case "back":
      return state.stack.length > 1
        ? { stack: state.stack.slice(0, -1), direction: -1 }
        : state;
  }
}

export function NavProvider({ children }: { children: ComponentChildren }) {
  const [state, dispatch] = useReducer(navReducer, {
    stack: [ROOT_ROUTE],
    direction: 1,
  });

  const open = useCallback((route: Route) => dispatch({ type: "open", route }), []);
  const push = useCallback((route: Route) => dispatch({ type: "push", route }), []);
  const back = useCallback(() => dispatch({ type: "back" }), []);

  const value = useMemo<NavContextValue>(() => {
    const route = currentRoute(state.stack);
    const section = state.stack.findLast(isSection);
    return {
      route,
      direction: state.direction,
      activeSection: section?.name ?? ROOT_SECTION,
      open,
      push,
      back,
    };
  }, [state, open, push, back]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const value = useContext(NavContext);
  if (!value) {
    throw new Error("useNav must be used within NavProvider");
  }
  return value;
}
