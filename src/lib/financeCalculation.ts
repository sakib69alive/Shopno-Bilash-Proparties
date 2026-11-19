export type CalculationMode = "items" | "split";

export interface CalculationLine {
  description: string;
  amount: string;
  quantity: string;
  ratio: string;
}

export interface CalculationInput {
  name: string;
  mode: CalculationMode;
  pool: string;
  lines: CalculationLine[];
}

export const MAX_CALCULATION_LINES = 50;
const MAX_TOTAL_CENTS = 100_000_000_000;
const ZERO = BigInt(0);
const ONE = BigInt(1);

function scaled(input: string, decimals: number) {
  if (!new RegExp(`^\\d{1,10}(?:\\.\\d{1,${decimals}})?$`).test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  return BigInt(whole + fraction.padEnd(decimals, "0"));
}

export function calculateFinanceDraft(input: CalculationInput): { total: number; lines: number[] } | null {
  if (!input.lines.length || input.lines.length > MAX_CALCULATION_LINES) return null;
  if (input.mode === "items") {
    const amounts = input.lines.map((item) => {
      const amount = scaled(item.amount, 2);
      const quantity = scaled(item.quantity, 3);
      return amount === null || quantity === null ? null : (amount * quantity + BigInt(500)) / BigInt(1000);
    });
    if (amounts.some((amount) => amount === null || amount > MAX_TOTAL_CENTS)) return null;
    const cents = amounts.map(Number);
    const total = cents.reduce((sum, amount) => sum + amount, 0);
    return total > MAX_TOTAL_CENTS ? null : { total: total / 100, lines: cents.map((amount) => amount / 100) };
  }

  const pool = scaled(input.pool, 2);
  const ratios = input.lines.map((item) => scaled(item.ratio, 3));
  if (pool === null || pool > MAX_TOTAL_CENTS || ratios.some((ratio) => ratio === null)) return null;
  const weights = ratios.map((ratio) => ratio ?? ZERO);
  const totalWeight = weights.reduce((sum, ratio) => sum + ratio, ZERO);
  if (totalWeight === ZERO) return null;
  const shares = weights.map((weight, index) => ({
    index,
    cents: (weight * pool) / totalWeight,
    remainder: (weight * pool) % totalWeight,
  }));
  const extraCents = Number(pool - shares.reduce((sum, share) => sum + share.cents, ZERO));
  const byRemainder = [...shares].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (const share of byRemainder.slice(0, extraCents)) share.cents += ONE;
  return { total: Number(pool) / 100, lines: shares.map((share) => Number(share.cents) / 100) };
}
