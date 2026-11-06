import type { Unit } from "@/types/unit";
import type { Parking } from "@/types/parking";
import type { AllocationMethod, OwnerType, UnitTier } from "@/types/finance/costAllocation";

export interface OwnerKey {
  ownerType: OwnerType;
  ownerId: string;
}

export function ownerKeyString(key: OwnerKey): string {
  return `${key.ownerType}:${key.ownerId}`;
}

export interface OwnerUnitsEntry {
  key: OwnerKey;
  units: Unit[];
}

/** One owner's computed (pre-rounding) share — `unitAmounts` breaks it back down per unit, feeding `UnitAllocation` rows. */
export interface RawOwnerShare {
  key: string;
  ownerKey: OwnerKey;
  units: Unit[];
  /** Human-readable basis for the preview table, e.g. "1,200 sqft" or "ratio 0.3421" or "3 unit(s), custom amount". */
  basisLabel: string;
  rawAmount: number;
  /** This owner's raw amount broken down per unit — sums to rawAmount (modulo float noise, reconciled later). */
  unitAmounts: { unit: Unit; rawAmount: number }[];
  /** Parking spaces folded into this owner's share (fixed-unit/custom methods only), if any. */
  parkingAmounts?: { parking: Parking; rawAmount: number }[];
}

/** Absent on a row created before this field existed = "sqft", the system's original and only method. */
export function resolveAllocationMethod(allocationMethod: AllocationMethod | undefined): AllocationMethod {
  return allocationMethod ?? "sqft";
}

function sqftOf(units: Unit[]): number {
  return units.reduce((s, u) => s + u.sizeSqft, 0);
}

/** A unit's ratio, when not manually overridden: its sqft proportion of every owned unit in the project — never persisted, computed fresh every time. */
function suggestedRatio(unit: Unit, allProjectUnits: Unit[]): number {
  const totalSqft = sqftOf(allProjectUnits);
  return totalSqft > 0 ? unit.sizeSqft / totalSqft : 0;
}

function ratioOf(unit: Unit, allProjectUnits: Unit[]): number {
  return unit.allocationRatio ?? suggestedRatio(unit, allProjectUnits);
}

/** Method B (area/sqft) — the system's original, only formula until now, extracted verbatim. */
export function computeSqftShares(unitsByOwner: Map<string, OwnerUnitsEntry>, totalAmount: number): RawOwnerShare[] {
  const totalSqft = [...unitsByOwner.values()].reduce((s, e) => s + sqftOf(e.units), 0);

  return [...unitsByOwner.entries()].map(([key, entry]) => {
    const basis = sqftOf(entry.units);
    const shareRatio = totalSqft > 0 ? basis / totalSqft : 0;
    const rawAmount = totalAmount * shareRatio;
    const unitAmounts = entry.units.map((unit) => ({
      unit,
      rawAmount: basis > 0 ? rawAmount * (unit.sizeSqft / basis) : 0,
    }));
    return { key, ownerKey: entry.key, units: entry.units, basisLabel: `${basis.toLocaleString()} sqft`, rawAmount, unitAmounts };
  });
}

/** Method A (predefined unit ratio) — falls back to sqft-proportional when a unit has no manual override. */
export function computeUnitRatioShares(
  unitsByOwner: Map<string, OwnerUnitsEntry>,
  totalAmount: number,
  allProjectUnits: Unit[],
): RawOwnerShare[] {
  const totalRatio = [...unitsByOwner.values()].reduce(
    (s, e) => s + e.units.reduce((rs, u) => rs + ratioOf(u, allProjectUnits), 0),
    0,
  );

  return [...unitsByOwner.entries()].map(([key, entry]) => {
    const basis = entry.units.reduce((s, u) => s + ratioOf(u, allProjectUnits), 0);
    const shareRatio = totalRatio > 0 ? basis / totalRatio : 0;
    const rawAmount = totalAmount * shareRatio;
    const unitAmounts = entry.units.map((unit) => ({
      unit,
      rawAmount: basis > 0 ? rawAmount * (ratioOf(unit, allProjectUnits) / basis) : 0,
    }));
    return { key, ownerKey: entry.key, units: entry.units, basisLabel: `ratio ${basis.toFixed(4)}`, rawAmount, unitAmounts };
  });
}

/**
 * Methods C (fixed amount per unit) and D (fully custom per unit) share one
 * mechanism — an Admin-entered amount per unit, keyed by `Unit.id` — the
 * only real difference is a UI convenience (fixed-unit's editor defaults
 * every input to one repeated figure; custom's editor starts blank), not a
 * different calculation. `customUnitAmounts` is keyed by `unit.id`, and
 * `customParkingAmounts` (when parking is included, see §6 of the plan) by
 * `parking.id`.
 */
export function computeCustomShares(
  unitsByOwner: Map<string, OwnerUnitsEntry>,
  customUnitAmounts: Record<string, number>,
): RawOwnerShare[] {
  return [...unitsByOwner.entries()]
    .map(([key, entry]) => {
      // Only flats that were given an amount count: an owner whose flats were all left out of the split (the Split Planner lets you pick which flats pay) gets no zero-taka bill.
      const charged = entry.units.filter((unit) => (customUnitAmounts[unit.id] ?? 0) > 0);
      const unitAmounts = charged.map((unit) => ({ unit, rawAmount: customUnitAmounts[unit.id] ?? 0 }));
      const rawAmount = unitAmounts.reduce((s, u) => s + u.rawAmount, 0);
      return {
        key,
        ownerKey: entry.key,
        units: charged,
        basisLabel: `${charged.length} unit(s), custom amount`,
        rawAmount,
        unitAmounts,
      };
    })
    .filter((share) => share.units.length > 0);
}

/**
 * Method F (tiered groups) — every owned unit starts at the same baseline
 * share (`totalAmount / unitCount`), regardless of size; the Admin then
 * groups units into named tiers and shifts a tier's share up or down
 * relative to that baseline (by percentage or a flat taka delta). A unit
 * belongs to at most one tier; units in no tier stay at the baseline.
 *
 * The grand total must always equal `totalAmount` exactly — raising one
 * tier's share is a *redistribution*, not new money, so every unadjusted
 * unit absorbs the difference equally. If every unit ends up inside an
 * adjusted tier and the adjustments don't already net back to the target,
 * there's nothing left to absorb the gap — that's reported as an error
 * rather than silently over- or under-billing.
 */
export interface TierLike {
  id: string;
  name: string;
  unitIds: string[];
  adjustmentMode: "percentage" | "fixed";
  adjustmentValue: number;
}

export interface TierUnitPreview {
  baseline: number;
  perUnitAmount: Map<string, number>;
  tierNameByUnitId: Map<string, string>;
}

/**
 * The core per-unit tier math, isomorphic (no server-only imports) so the
 * exact same function drives both the real generation pipeline
 * (`computeTierShares`, below) and the tier builder UI's live preview —
 * one formula, never two copies that can drift apart.
 */
export function computeTierUnitAmounts(
  unitIds: string[],
  tiers: TierLike[],
  totalAmount: number,
): TierUnitPreview | { error: string } {
  const unitCount = unitIds.length;
  if (unitCount === 0) return { error: "No owned units found in this project — nothing to allocate." };

  const baseline = totalAmount / unitCount;
  const ownedUnitIds = new Set(unitIds);

  function tierPerUnitAmount(tier: TierLike): number {
    return tier.adjustmentMode === "percentage" ? baseline * (1 + tier.adjustmentValue / 100) : baseline + tier.adjustmentValue;
  }

  const tierByUnitId = new Map<string, TierLike>();
  let adjustedTotal = 0;
  let adjustedCount = 0;
  for (const tier of tiers) {
    if (tier.adjustmentValue === 0) continue;
    const perUnit = tierPerUnitAmount(tier);
    for (const unitId of tier.unitIds) {
      if (!ownedUnitIds.has(unitId) || tierByUnitId.has(unitId)) continue;
      tierByUnitId.set(unitId, tier);
      adjustedTotal += perUnit;
      adjustedCount += 1;
    }
  }

  const remainingCount = unitCount - adjustedCount;
  const remainingAmount = totalAmount - adjustedTotal;
  if (remainingCount === 0 && Math.round(Math.abs(remainingAmount)) > 0) {
    return {
      error:
        "Every unit is inside an adjusted tier and the adjustments don't add back up to the target. Leave at least one unit at the baseline (unassigned or in a 0% tier), or rebalance the percentages so they net back to 100%.",
    };
  }
  const baselineAfterAdjustment = remainingCount > 0 ? remainingAmount / remainingCount : 0;

  const perUnitAmount = new Map<string, number>();
  const tierNameByUnitId = new Map<string, string>();
  for (const unitId of unitIds) {
    const tier = tierByUnitId.get(unitId);
    perUnitAmount.set(unitId, tier ? tierPerUnitAmount(tier) : baselineAfterAdjustment);
    if (tier) tierNameByUnitId.set(unitId, tier.name);
  }

  return { baseline, perUnitAmount, tierNameByUnitId };
}

/**
 * Method F (tiered groups) — every owned unit starts at the same baseline
 * share (`totalAmount / unitCount`), regardless of size; the Admin then
 * groups units into named tiers and shifts a tier's share up or down
 * relative to that baseline (by percentage or a flat taka delta). A unit
 * belongs to at most one tier; units in no tier stay at the baseline.
 *
 * The grand total must always equal `totalAmount` exactly — raising one
 * tier's share is a *redistribution*, not new money, so every unadjusted
 * unit absorbs the difference equally. If every unit ends up inside an
 * adjusted tier and the adjustments don't already net back to the target,
 * there's nothing left to absorb the gap — that's reported as an error
 * rather than silently over- or under-billing.
 */
export function computeTierShares(
  unitsByOwner: Map<string, OwnerUnitsEntry>,
  tiers: UnitTier[],
  totalAmount: number,
): RawOwnerShare[] | { error: string } {
  const allUnits = [...unitsByOwner.values()].flatMap((e) => e.units);
  const result = computeTierUnitAmounts(
    allUnits.map((u) => u.id),
    tiers,
    totalAmount,
  );
  if ("error" in result) return result;
  const { perUnitAmount, tierNameByUnitId } = result;

  return [...unitsByOwner.entries()].map(([key, entry]) => {
    const unitAmounts = entry.units.map((unit) => ({ unit, rawAmount: perUnitAmount.get(unit.id) ?? 0 }));
    const rawAmount = unitAmounts.reduce((s, u) => s + u.rawAmount, 0);
    const tierNames = [...new Set(entry.units.map((u) => tierNameByUnitId.get(u.id) ?? "Baseline"))];
    return {
      key,
      ownerKey: entry.key,
      units: entry.units,
      basisLabel: tierNames.join(", "),
      rawAmount,
      unitAmounts,
    };
  });
}

/**
 * Folds Parking contributions (fixed-unit/custom/tier methods only —
 * parking has no sqft/ratio basis to proportion against, stated honestly
 * rather than inventing a fake area-equivalent) into the matching owner's
 * share — kept as an admin-typed amount independent of the tier
 * rebalancing math, so parking figures never need to "add up" against a
 * unit-based target — creating a new owner entry when a parking space's
 * owner holds no unit in
 * this allocation — a valid real scenario (someone who bought only
 * parking).
 */
export function foldInParkingContributions(
  shares: RawOwnerShare[],
  parkingSpaces: Parking[],
  customParkingAmounts: Record<string, number>,
): RawOwnerShare[] {
  const byKey = new Map(shares.map((s) => [s.key, { ...s, unitAmounts: [...s.unitAmounts], parkingAmounts: [...(s.parkingAmounts ?? [])] }]));

  for (const parking of parkingSpaces) {
    if (!parking.ownerType || !parking.ownerId) continue;
    const amount = customParkingAmounts[parking.id];
    if (!amount) continue;

    const key = ownerKeyString({ ownerType: parking.ownerType, ownerId: parking.ownerId });
    const existing = byKey.get(key);
    if (existing) {
      existing.rawAmount += amount;
      existing.parkingAmounts!.push({ parking, rawAmount: amount });
    } else {
      byKey.set(key, {
        key,
        ownerKey: { ownerType: parking.ownerType, ownerId: parking.ownerId },
        units: [],
        basisLabel: "Parking only",
        rawAmount: amount,
        unitAmounts: [],
        parkingAmounts: [{ parking, rawAmount: amount }],
      });
    }
  }

  return [...byKey.values()];
}
