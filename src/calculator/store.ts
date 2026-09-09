import { createStore } from "../lib/createStore";
import { type Operator } from "./calc";
import { INITIAL_BASIC, type BasicState } from "./model";

export type CalcMode = "basic" | "percent";

export type CalculatorState = {
  mode: CalcMode;
  basic: BasicState;
  amount: string;
  rate: string;
};

const INITIAL: CalculatorState = {
  mode: "basic",
  basic: INITIAL_BASIC,
  amount: "",
  rate: "",
};

function parseOp(value: unknown): Operator | null {
  return value === "+" || value === "-" || value === "*" || value === "/" ? value : null;
}

function parseBasic(raw: unknown): BasicState | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { entry, acc, op, fresh, error } = raw as Record<string, unknown>;
  if (
    typeof entry !== "string" ||
    typeof fresh !== "boolean" ||
    typeof error !== "boolean"
  ) {
    return null;
  }
  if (acc !== null && (typeof acc !== "number" || !Number.isFinite(acc))) {
    return null;
  }
  if (
    error
      ? entry !== "Ошибка"
      : !Number.isFinite(Number(entry.replace(/\s/g, "").replace(",", ".")))
  )
    return null;
  const parsedOp = op === null ? null : parseOp(op);
  if (op !== null && parsedOp === null) {
    return null;
  }
  return { entry, acc, op: parsedOp, fresh, error };
}

function parseState(raw: unknown): CalculatorState | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { mode, basic, amount, rate } = raw as Record<string, unknown>;
  if (mode !== "basic" && mode !== "percent") {
    return null;
  }
  const parsedBasic = parseBasic(basic);
  if (!parsedBasic || typeof amount !== "string" || typeof rate !== "string") {
    return null;
  }
  return { mode, basic: parsedBasic, amount, rate };
}

export const calculatorStore = createStore<CalculatorState>({
  key: "t-helper-calculator",
  fallback: () => INITIAL,
  parse: parseState,
});

export function setCalcMode(mode: CalcMode): void {
  calculatorStore.update((current) =>
    current.mode === mode ? current : { ...current, mode },
  );
}

export function setBasicState(basic: BasicState): void {
  calculatorStore.update((current) => ({ ...current, basic }));
}

export function setAmount(amount: string): void {
  calculatorStore.update((current) =>
    current.amount === amount ? current : { ...current, amount },
  );
}

export function setRate(rate: string): void {
  calculatorStore.update((current) =>
    current.rate === rate ? current : { ...current, rate },
  );
}
