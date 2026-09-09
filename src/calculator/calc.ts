export type Operator = "+" | "-" | "*" | "/";

function finiteResult(value: number): number | null {
  return Number.isFinite(value) ? Number(value.toPrecision(15)) : null;
}

export function applyOp(left: number, op: Operator, right: number): number | null {
  switch (op) {
    case "+":
      return finiteResult(left + right);
    case "-":
      return finiteResult(left - right);
    case "*":
      return finiteResult(left * right);
    case "/":
      return right === 0 ? null : finiteResult(left / right);
  }
}

export function parseEntry(entry: string): number {
  return Number(entry.replace(/\s/g, "").replace(",", "."));
}

export function formatEntry(value: number): string {
  if (!Number.isFinite(value)) {
    return "Ошибка";
  }
  if (Object.is(value, -0)) {
    return "0";
  }
  const raw = String(finiteResult(value)).replace(".", ",");
  if (/e/i.test(raw)) {
    return raw;
  }
  return formatAmountInput(raw);
}

export function formatDisplay(entry: string): string {
  if (entry === "Ошибка" || /^-?\d+(?:,\d+)?e[+-]?\d+$/i.test(entry)) {
    return entry;
  }
  return formatAmountInput(entry);
}

export function applyPercent(
  acc: number | null,
  op: Operator | null,
  value: number,
): number | null {
  if (acc === null || !op) {
    return finiteResult(value / 100);
  }
  const portion = (acc * value) / 100;
  switch (op) {
    case "+":
      return finiteResult(acc + portion);
    case "-":
      return finiteResult(acc - portion);
    case "*":
      return finiteResult(portion);
    case "/":
      return value === 0 ? null : finiteResult(acc / (value / 100));
  }
}

export function formatAmountInput(raw: string): string {
  let text = raw.replace(/\s/g, "").replace(".", ",");
  const negative = text.startsWith("-");
  if (negative) {
    text = text.slice(1);
  }
  text = text.replace(/[^\d,]/g, "");
  const comma = text.indexOf(",");
  let intPart = comma === -1 ? text : text.slice(0, comma);
  const frac = comma === -1 ? null : text.slice(comma + 1).replace(/,/g, "");
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (!intPart && frac === null) {
    return negative ? "-" : "";
  }
  if (!intPart) {
    intPart = "0";
  }
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = negative ? "-" : "";
  return frac === null ? `${sign}${grouped}` : `${sign}${grouped},${frac}`;
}

export function digitsBefore(value: string, caret: number): number {
  return value.slice(0, Math.max(0, caret)).replace(/\D/g, "").length;
}

export function indexAfterDigits(value: string, count: number): number {
  if (count <= 0) {
    return value.startsWith("-") ? 1 : 0;
  }
  let seen = 0;
  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i] ?? "")) {
      seen += 1;
      if (seen === count) {
        return i + 1;
      }
    }
  }
  return value.length;
}

export function formatAmountEdit(
  raw: string,
  caret: number,
): { value: string; caret: number } {
  const value = formatAmountInput(raw);
  const prefix = raw.slice(0, caret).replace(".", ",");
  const formattedPrefix = formatAmountInput(prefix);
  const position = prefix.endsWith(",")
    ? value.indexOf(",") + 1
    : indexAfterDigits(value, digitsBefore(formattedPrefix, formattedPrefix.length));
  return { value, caret: position };
}

export function parseLooseNumber(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function interestFromAnnual(amount: number, annualPercent: number) {
  const year = (amount * annualPercent) / 100;
  if (!Number.isFinite(year)) return null;
  return {
    day: year / 365,
    month: year / 12,
    year,
  };
}
