import { describe, expect, it } from "vitest";
import {
  applyOp,
  formatAmountEdit,
  formatDisplay,
  formatEntry,
  interestFromAnnual,
  parseLooseNumber,
} from "../src/calculator/calc";
import {
  INITIAL_BASIC,
  reduceCalculator,
  type CalculatorAction,
} from "../src/calculator/model";

function calculate(...actions: CalculatorAction[]) {
  return actions.reduce(reduceCalculator, INITIAL_BASIC);
}

describe("calculator", () => {
  it.each([1e21, 1e-7, -1.2345e25])(
    "preserves the value of scientific notation %s",
    (value) => {
      expect(Number(formatDisplay(formatEntry(value)).replace(",", "."))).toBe(value);
    },
  );
  it("rounds arithmetic to the supported 15 significant digits", () => {
    expect(applyOp(0.1, "+", 0.2)).toBe(0.3);
    expect(applyOp(1, "/", 3)).toBe(0.333333333333333);
  });
  it("rejects overflow and division by zero", () => {
    expect(applyOp(1e308, "*", 1e308)).toBeNull();
    expect(applyOp(1, "/", 0)).toBeNull();
    expect(interestFromAnnual(1e308, 1e308)).toBeNull();
  });
  it("changes a pending operator without applying it twice", () => {
    expect(
      calculate(
        { type: "digit", digit: "8" },
        { type: "op", op: "+" },
        { type: "op", op: "*" },
        { type: "digit", digit: "3" },
        { type: "eq" },
      ).entry,
    ).toBe("24");
  });
  it("supports chained calculations and percentage adjustments", () => {
    expect(
      calculate(
        { type: "digit", digit: "5" },
        { type: "op", op: "+" },
        { type: "digit", digit: "5" },
        { type: "op", op: "*" },
        { type: "digit", digit: "2" },
        { type: "eq" },
      ).entry,
    ).toBe("20");
    expect(
      calculate(
        { type: "digit", digit: "2" },
        { type: "digit", digit: "0" },
        { type: "digit", digit: "0" },
        { type: "op", op: "+" },
        { type: "digit", digit: "1" },
        { type: "digit", digit: "0" },
        { type: "percent" },
      ).entry,
    ).toBe("220");
  });
  it("recovers from an arithmetic error only after clearing", () => {
    const error = calculate(
      { type: "digit", digit: "1" },
      { type: "op", op: "/" },
      { type: "digit", digit: "0" },
      { type: "eq" },
    );
    expect(error.error).toBe(true);
    expect(reduceCalculator(error, { type: "digit", digit: "2" })).toBe(error);
    expect(reduceCalculator(error, { type: "clear" })).toEqual(INITIAL_BASIC);
  });
  it("limits integer entry to the supported precision", () => {
    const actions: CalculatorAction[] = Array.from({ length: 40 }, () => ({
      type: "digit",
      digit: "9",
    }));
    expect(calculate(...actions).entry).toHaveLength(15);
  });
  it.each([
    ["1234,", 5, "1 234,", 6],
    ["1234,5", 6, "1 234,5", 7],
    ["1 234,56", 7, "1 234,56", 7],
    ["-12.", 4, "-12,", 4],
  ] as const)(
    "keeps the caret while formatting %s",
    (raw, caret, value, expectedCaret) => {
      expect(formatAmountEdit(raw, caret)).toEqual({ value, caret: expectedCaret });
    },
  );
  it.each(["0xff", "1e3", "Infinity", "--1", "1,2,3"])(
    "rejects non-decimal percentage input %s",
    (raw) => {
      expect(parseLooseNumber(raw)).toBeNull();
    },
  );
});
