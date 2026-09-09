import { applyOp, applyPercent, formatEntry, parseEntry, type Operator } from "./calc";

export type BasicState = {
  entry: string;
  acc: number | null;
  op: Operator | null;
  fresh: boolean;
  error: boolean;
};

export type CalculatorAction =
  | { type: "digit"; digit: string }
  | { type: "op"; op: Operator }
  | { type: "dot" | "eq" | "clear" | "back" | "sign" | "percent" };

export const INITIAL_BASIC: BasicState = {
  entry: "0",
  acc: null,
  op: null,
  fresh: true,
  error: false,
};

const MAX_INPUT_DIGITS = 15;

function resultState(value: number | null, op: Operator | null = null): BasicState {
  if (value === null || !Number.isFinite(value)) {
    return { ...INITIAL_BASIC, entry: "Ошибка", error: true };
  }
  return {
    entry: formatEntry(value),
    acc: op ? value : null,
    op,
    fresh: true,
    error: false,
  };
}

export function reduceCalculator(
  state: BasicState,
  action: CalculatorAction,
): BasicState {
  if (action.type === "clear") return INITIAL_BASIC;
  if (state.error) return state;

  switch (action.type) {
    case "digit": {
      if (!/^\d$/.test(action.digit)) return state;
      if (state.fresh || state.entry === "0") {
        return { ...state, entry: action.digit, fresh: false };
      }
      if (state.entry === "-0") return { ...state, entry: `-${action.digit}` };
      if (state.entry.replace(/\D/g, "").length >= MAX_INPUT_DIGITS) return state;
      return { ...state, entry: state.entry + action.digit };
    }
    case "dot":
      if (state.fresh) return { ...state, entry: "0,", fresh: false };
      return state.entry.includes(",") ? state : { ...state, entry: state.entry + "," };
    case "sign":
      return state.entry === "0"
        ? state
        : {
            ...state,
            entry: state.entry.startsWith("-") ? state.entry.slice(1) : `-${state.entry}`,
          };
    case "back": {
      if (state.fresh) return state;
      const entry = state.entry.slice(0, -1);
      return !entry || entry === "-"
        ? { ...state, entry: "0", fresh: true }
        : { ...state, entry };
    }
    case "percent":
      return resultState(applyPercent(state.acc, state.op, parseEntry(state.entry)));
    case "op": {
      const value = parseEntry(state.entry);
      return state.acc !== null && state.op && !state.fresh
        ? resultState(applyOp(state.acc, state.op, value), action.op)
        : { ...state, acc: value, op: action.op, fresh: true };
    }
    case "eq":
      return state.acc !== null && state.op
        ? resultState(applyOp(state.acc, state.op, parseEntry(state.entry)))
        : state;
  }
}
