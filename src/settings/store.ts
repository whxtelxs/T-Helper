import { createStore } from "../lib/createStore";
import type { OperatorGender } from "../lib/gender";
import { applyTheme, isAppTheme, type AppTheme, type ThemeOrigin } from "./theme";

type Settings = {
  operatorGender: OperatorGender;
  theme: AppTheme;
};

const DEFAULT_SETTINGS: Settings = {
  operatorGender: "male",
  theme: "dark",
};

export const settingsStore = createStore<Settings>({
  key: "t-helper-settings",
  fallback: () => DEFAULT_SETTINGS,
  parse: (raw) => {
    if (typeof raw !== "object" || raw === null) {
      return null;
    }
    const { operatorGender, theme } = raw as Record<string, unknown>;
    if (operatorGender !== "male" && operatorGender !== "female") {
      return null;
    }
    return {
      operatorGender,
      theme: isAppTheme(theme) ? theme : DEFAULT_SETTINGS.theme,
    };
  },
});

applyTheme(settingsStore.get().theme);

export function setOperatorGender(operatorGender: OperatorGender): void {
  if (settingsStore.get().operatorGender !== operatorGender) {
    settingsStore.update((current) => ({ ...current, operatorGender }));
  }
}

export function setTheme(theme: AppTheme, origin?: ThemeOrigin | null): void {
  if (settingsStore.get().theme !== theme) {
    settingsStore.update((current) => ({ ...current, theme }));
    applyTheme(theme, origin);
  }
}
