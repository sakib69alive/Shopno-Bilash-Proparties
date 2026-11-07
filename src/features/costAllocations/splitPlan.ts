/**
 * The arithmetic behind the Split Planner (the screen where the Admin picks
 * which flats pay and how). Plain functions with no server imports, so the
 * live chart on screen and any later check use the exact same numbers.
 *
 * Rule: flats with a custom figure (a taka amount or a % of the total) are
 * fixed first. Whatever is left of the total is then shared among the other
 * chosen flats — equally, or by area. Every figure is whole taka and the
 * flats always add up to the total exactly (any 1–2 taka of rounding goes to
 * the largest shared flat, the same convention as `rounding.ts`).
 */
export type SplitBasis = "equal" | "sqft";

/**
 * "amount" / "percent": the flat pays exactly that (taka, or % of the whole total).
 * "extraPercent" / "extraAmount": the flat pays MORE than its normal share by that
 * much (a minus number means less); the other flats absorb the difference.
 */
export interface SplitOverride {
  mode: "amount" | "percent" | "extraPercent" | "extraAmount";
  value: number;
}

export interface SplitUnit {
  id: string;
  sqft: number;
}

export interface SplitPlan {
  /** taka per unit id (only the chosen flats). */
  amounts: Record<string, number>;
  /** Sum of the custom (fixed) flats. */
  customTotal: number;
  /** What the other chosen flats share between them. */
  sharedTotal: number;
  sharedCount: number;
  error?: string;
}

export interface OnTopPlan {
  amounts: Record<string, number>;
  /** What each chosen flat would pay with no custom amounts at all (the budget as first planned). */
  base: Record<string, number>;
  /** The budget as first planned. */
  originalTotal: number;
  /** The new total: every flat's amount added up. */
  newTotal: number;
  /** newTotal − originalTotal (minus when someone was given less). */
  extra: number;
  error?: string;
}

/**
 * "Keep everyone else's amount." The flats nobody touched pay exactly what they would have paid anyway; a flat with a custom figure pays
 * that figure, and the difference goes ON TOP of the budget instead of being taken from the others — so a budget of 2,000 with one flat
 * set 40 higher becomes 2,040. Custom modes mean the same as in `computeSplitPlan` ("more by %", "more by ৳", "exactly ৳", "exactly % of
 * the budget").
 */
export function computeSplitOnTop(total: number, units: SplitUnit[], basis: SplitBasis, overrides: Record<string, SplitOverride | undefined>): OnTopPlan {
  const baseline = computeSplitPlan(total, units, basis, {});
  const base = baseline.amounts;
  const amounts: Record<string, number> = {};
  for (const unit of units) {
    const b = base[unit.id] ?? 0;
    const o = overrides[unit.id];
    if (!o || !Number.isFinite(o.value)) {
      amounts[unit.id] = b;
    } else if (o.mode === "amount") {
      amounts[unit.id] = Math.max(0, Math.round(o.value));
    } else if (o.mode === "percent") {
      amounts[unit.id] = Math.max(0, Math.round((total * o.value) / 100));
    } else if (o.mode === "extraPercent") {
      amounts[unit.id] = Math.max(0, Math.round(b * (1 + o.value / 100)));
    } else {
      amounts[unit.id] = Math.max(0, Math.round(b + o.value));
    }
  }
  const newTotal = units.reduce((sum, u) => sum + (amounts[u.id] ?? 0), 0);
  return { amounts, base, originalTotal: total, newTotal, extra: newTotal - total, error: baseline.error };
}

export function computeSplitPlan(total: number, units: SplitUnit[], basis: SplitBasis, overrides: Record<string, SplitOverride | undefined>): SplitPlan {
  const amounts: Record<string, number> = {};
  const empty: SplitPlan = { amounts, customTotal: 0, sharedTotal: 0, sharedCount: 0 };
  if (units.length === 0) return empty;

  let customTotal = 0;
  const open: SplitUnit[] = [];
  const adjusted: { unit: SplitUnit; mode: "extraPercent" | "extraAmount"; value: number }[] = [];
  for (const unit of units) {
    const o = overrides[unit.id];
    if (!o || !Number.isFinite(o.value)) {
      open.push(unit);
    } else if (o.mode === "amount" || o.mode === "percent") {
      if (o.value < 0) {
        open.push(unit);
        continue;
      }
      const amount = Math.round(o.mode === "percent" ? (total * o.value) / 100 : o.value);
      amounts[unit.id] = amount;
      customTotal += amount;
    } else {
      adjusted.push({ unit, mode: o.mode, value: o.value });
      open.push(unit);
    }
  }

  const pool = total - customTotal;
  if (pool < 0) {
    return { ...empty, amounts, customTotal, sharedTotal: pool, sharedCount: open.length, error: "The fixed amounts add up to more than the total." };
  }
  if (open.length === 0) {
    if (pool !== 0) {
      return { amounts, customTotal, sharedTotal: pool, sharedCount: 0, error: "Every chosen flat has a fixed amount, but they don't add up to the total — leave at least one flat to share the rest, or fix the amounts." };
    }
    return { amounts, customTotal, sharedTotal: pool, sharedCount: 0 };
  }

  // Normal share of each open flat (equal, or by area), before any "pay more / less" adjustments.
  const sqftSum = open.reduce((sum, u) => sum + u.sqft, 0);
  const useSqft = basis === "sqft" && sqftSum > 0;
  const weight = (u: SplitUnit) => (useSqft ? u.sqft : 1);
  const weightSum = open.reduce((sum, u) => sum + weight(u), 0);
  const normal = (u: SplitUnit) => (pool * weight(u)) / weightSum;

  const adjustedIds = new Set(adjusted.map((a) => a.unit.id));
  const rows: { id: string; amount: number }[] = [];
  let adjustedTotal = 0;
  for (const a of adjusted) {
    const base = normal(a.unit);
    const amount = Math.max(0, Math.round(a.mode === "extraPercent" ? base * (1 + a.value / 100) : base + a.value));
    rows.push({ id: a.unit.id, amount });
    adjustedTotal += amount;
  }
  const others = open.filter((u) => !adjustedIds.has(u.id));
  const remainder = pool - adjustedTotal;
  if (others.length === 0) {
    if (remainder !== 0) {
      return { amounts, customTotal, sharedTotal: pool, sharedCount: open.length, error: "Every flat has a 'pay more / less' change, so nobody is left to cover the difference. Leave at least one flat on its normal share." };
    }
  } else {
    if (remainder < 0) {
      return { amounts, customTotal, sharedTotal: pool, sharedCount: open.length, error: "The extra amounts are more than the total — lower them." };
    }
    const otherWeight = others.reduce((sum, u) => sum + weight(u), 0);
    for (const u of others) rows.push({ id: u.id, amount: Math.round((remainder * weight(u)) / otherWeight) });
  }

  // Whole taka, always adding up to the total: any 1–2 taka of rounding goes to the largest flat that wasn't set by hand.
  const diff = pool - rows.reduce((sum, r) => sum + r.amount, 0);
  if (diff !== 0 && rows.length > 0) {
    const pickFrom = rows.filter((r) => !adjustedIds.has(r.id));
    const largest = (pickFrom.length > 0 ? pickFrom : rows).reduce((a, b) => (b.amount > a.amount ? b : a));
    largest.amount += diff;
  }
  for (const r of rows) amounts[r.id] = r.amount;

  return { amounts, customTotal, sharedTotal: pool, sharedCount: open.length };
}
