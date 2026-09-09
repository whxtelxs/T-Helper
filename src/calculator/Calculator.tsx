import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef } from "preact/hooks";
import { useStore } from "../hooks/useStore";
import { copyToClipboard } from "../lib/clipboard";
import { EASE_OUT } from "../lib/motion";
import { toast } from "../toast/store";
import {
  formatAmountEdit,
  formatDisplay,
  formatMoney,
  interestFromAnnual,
  parseLooseNumber,
  type Operator,
} from "./calc";
import {
  calculatorStore,
  setAmount,
  setBasicState,
  setCalcMode,
  setRate,
  type CalcMode,
} from "./store";
import { reduceCalculator, type CalculatorAction } from "./model";
import "./Calculator.css";

const MODES: readonly { id: CalcMode; label: string }[] = [
  { id: "basic", label: "Калькулятор" },
  { id: "percent", label: "Проценты" },
];

const MODE_SLIDE = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 20 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -16 }),
};

const MODE_FADE = {
  enter: { opacity: 0, x: 0 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 0 },
};

const KEYS: readonly {
  id: string;
  label: string;
  kind: "digit" | "dot" | "op" | "eq" | "clear" | "back" | "sign" | "percent";
  op?: Operator;
}[] = [
  { id: "c", label: "C", kind: "clear" },
  { id: "back", label: "⌫", kind: "back" },
  { id: "pct", label: "%", kind: "percent" },
  { id: "div", label: "÷", kind: "op", op: "/" },
  { id: "7", label: "7", kind: "digit" },
  { id: "8", label: "8", kind: "digit" },
  { id: "9", label: "9", kind: "digit" },
  { id: "mul", label: "×", kind: "op", op: "*" },
  { id: "4", label: "4", kind: "digit" },
  { id: "5", label: "5", kind: "digit" },
  { id: "6", label: "6", kind: "digit" },
  { id: "sub", label: "−", kind: "op", op: "-" },
  { id: "1", label: "1", kind: "digit" },
  { id: "2", label: "2", kind: "digit" },
  { id: "3", label: "3", kind: "digit" },
  { id: "add", label: "+", kind: "op", op: "+" },
  { id: "sign", label: "±", kind: "sign" },
  { id: "0", label: "0", kind: "digit" },
  { id: "dot", label: ",", kind: "dot" },
  { id: "eq", label: "=", kind: "eq" },
];

function BasicCalculator() {
  const { basic: state } = useStore(calculatorStore);

  const press = (action: CalculatorAction) => {
    const current = calculatorStore.get().basic;
    const next = reduceCalculator(current, action);
    if (next !== current) setBasicState(next);
  };

  return (
    <div class="calc-basic">
      <div class="calc-display" aria-live="polite">
        {formatDisplay(state.entry)}
      </div>
      <div class="calc-pad">
        {KEYS.map((key) => (
          <button
            key={key.id}
            type="button"
            class={
              key.kind === "eq"
                ? "calc-key calc-key--eq"
                : key.kind === "op"
                  ? "calc-key calc-key--op"
                  : "calc-key"
            }
            onClick={() => {
              if (key.kind === "digit") press({ type: "digit", digit: key.label });
              else if (key.kind === "op") {
                if (key.op) press({ type: "op", op: key.op });
              } else press({ type: key.kind });
            }}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PercentCalculator() {
  const { amount, rate } = useStore(calculatorStore);
  const amountRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = amountRef.current;
    const count = caretRef.current;
    if (!input || count === null) {
      return;
    }
    const pos = count;
    input.setSelectionRange(pos, pos);
    caretRef.current = null;
  }, [amount]);

  const amountValue = parseLooseNumber(amount);
  const rateValue = parseLooseNumber(rate);
  const ready =
    amountValue !== null &&
    rateValue !== null &&
    amount.trim() !== "" &&
    rate.trim() !== "";
  const interest = ready ? interestFromAnnual(amountValue, rateValue) : null;

  const copyValue = async (label: string, value: number) => {
    if (await copyToClipboard(formatMoney(value))) {
      toast.success(`Скопировано: ${label}`);
    } else {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <div class="calc-percent">
      <div class="calc-field">
        <label for="calc-amount">Сумма</label>
        <input
          ref={amountRef}
          id="calc-amount"
          inputMode="decimal"
          value={amount}
          placeholder="0"
          onInput={(event) => {
            const input = event.currentTarget;
            const edit = formatAmountEdit(
              input.value,
              input.selectionStart ?? input.value.length,
            );
            input.value = edit.value;
            input.setSelectionRange(edit.caret, edit.caret);
            caretRef.current = edit.caret;
            setAmount(edit.value);
          }}
        />
      </div>
      <div class="calc-field">
        <label for="calc-rate">Процентов годовых</label>
        <input
          id="calc-rate"
          inputMode="decimal"
          value={rate}
          placeholder="0"
          onInput={(event) => setRate(event.currentTarget.value)}
        />
      </div>
      <div class="calc-results">
        {(
          [
            ["В день", interest?.day],
            ["В месяц", interest?.month],
            ["В год", interest?.year],
          ] as const
        ).map(([label, value]) => (
          <button
            key={label}
            type="button"
            class="calc-result"
            disabled={value === undefined}
            onClick={() => {
              if (value !== undefined) {
                void copyValue(label.toLowerCase(), value);
              }
            }}
          >
            <span class="calc-result-label">{label}</span>
            <span class="calc-result-value">
              {value === undefined ? "Нет данных" : formatMoney(value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Calculator() {
  const { mode } = useStore(calculatorStore);
  const reduceMotion = useReducedMotion();
  const direction = useRef(1);

  return (
    <section class="calc">
      <div class="calc-modes">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            class={mode === item.id ? "calc-mode calc-mode--on" : "calc-mode"}
            onClick={() => {
              if (item.id === mode) {
                return;
              }
              direction.current = item.id === "percent" ? 1 : -1;
              setCalcMode(item.id);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div class="calc-stage">
        <AnimatePresence initial={false} custom={direction.current}>
          <motion.div
            key={mode}
            class="calc-pane"
            custom={direction.current}
            variants={reduceMotion ? MODE_FADE : MODE_SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              reduceMotion ? { duration: 0.1 } : { duration: 0.2, ease: EASE_OUT }
            }
          >
            {mode === "basic" ? <BasicCalculator /> : <PercentCalculator />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
