import { useStore } from "../hooks/useStore";
import type { OperatorGender } from "../lib/gender";
import { settingsStore } from "./store";

export function useOperatorGender(): OperatorGender {
  return useStore(settingsStore).operatorGender;
}
