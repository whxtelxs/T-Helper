export type AppTheme = "dark" | "light";

export type ThemeOrigin = {
  x: number;
  y: number;
};

export const THEME_LABELS: Record<AppTheme, string> = {
  dark: "Тёмная",
  light: "Светлая",
};

const THEME_TRANSITION_MS = 520;
let animationId = 0;
let activeTransition: ViewTransition | undefined;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "dark" || value === "light";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function commitTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

function clearThemeOriginVars(root: HTMLElement): void {
  root.style.removeProperty("--theme-ox");
  root.style.removeProperty("--theme-oy");
  root.style.removeProperty("--theme-r");
}

function animateWithCssFallback(commit: () => void): void {
  const root = document.documentElement;
  root.classList.add("theme-transition");
  commit();
  fallbackTimer = setTimeout(() => {
    root.classList.remove("theme-transition");
    fallbackTimer = undefined;
  }, THEME_TRANSITION_MS);
}

export function applyTheme(theme: AppTheme, origin?: ThemeOrigin | null): void {
  const id = ++animationId;
  const root = document.documentElement;
  activeTransition?.skipTransition();
  activeTransition = undefined;
  clearTimeout(fallbackTimer);
  root.classList.remove("theme-transition");
  clearThemeOriginVars(root);
  if (!origin || prefersReducedMotion()) {
    commitTheme(theme);
    return;
  }

  const transitionDocument: { startViewTransition?: Document["startViewTransition"] } =
    document;
  const startViewTransition = transitionDocument.startViewTransition?.bind(document);
  if (startViewTransition) {
    const root = document.documentElement;
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );

    root.style.setProperty("--theme-ox", `${origin.x}px`);
    root.style.setProperty("--theme-oy", `${origin.y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);

    const transition = startViewTransition(() => {
      if (id === animationId) commitTheme(theme);
    });
    activeTransition = transition;

    const finish = () => {
      if (id === animationId) {
        clearThemeOriginVars(root);
        activeTransition = undefined;
      }
    };
    void transition.ready.catch(() => undefined);
    void transition.finished.then(finish, finish);
    return;
  }

  animateWithCssFallback(() => commitTheme(theme));
}

export function themeOriginFromEvent(event: Event): ThemeOrigin {
  const target = event.currentTarget;
  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  if (event instanceof MouseEvent) {
    return { x: event.clientX, y: event.clientY };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}
