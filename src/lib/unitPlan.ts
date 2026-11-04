import type { Project, UnitType } from "@/types/project";
import type { Unit } from "@/types/unit";

/**
 * Which blueprint a flat shows. Resolved at read time (never copied onto the
 * flat), so editing a type's image or code updates every flat that uses it:
 *
 *   1. the flat's own custom plan (`Unit.layoutImage`)
 *   2. the type chosen for it explicitly (`Unit.unitTypeId`)
 *   3. the type whose position code matches the flat number — "A" for 1A,
 *      2A, 3A… (see `unitPositionKeys`)
 *   4. nothing
 */
export type UnitPlanSource = "custom" | "type" | "auto-type" | "none";

export interface ResolvedUnitPlan {
  src?: string;
  source: UnitPlanSource;
  type?: UnitType;
}

/**
 * The parts of a flat number that repeat from floor to floor, most specific
 * first: the number without its floor ("1A" → "A", "12-B" → "B"), its
 * trailing letters, and its last two digits ("A-502" → "02"). Compared
 * case-insensitively against a type's `positionCode`.
 */
export function unitPositionKeys(unitNumber: string, floorNumber?: number): string[] {
  const n = unitNumber.trim().toUpperCase();
  const keys: string[] = [];
  const add = (k: string | undefined) => {
    const v = (k ?? "").replace(/^[\s-]+|[\s-]+$/g, "");
    if (v && !keys.includes(v)) keys.push(v);
  };

  if (floorNumber !== undefined && n.startsWith(String(floorNumber))) add(n.slice(String(floorNumber).length));
  add(n.replace(/^\d+/, ""));
  add(n.match(/[A-Z]+$/)?.[0]);
  add(n.match(/\d{2}$/)?.[0]);
  return keys;
}

export function matchUnitType(unitNumber: string, types: UnitType[], floorNumber?: number): UnitType | undefined {
  const keys = unitPositionKeys(unitNumber, floorNumber);
  for (const key of keys) {
    const hit = types.find((t) => t.positionCode && t.positionCode.trim().toUpperCase() === key);
    if (hit) return hit;
  }
  return undefined;
}

export function resolveUnitPlan(
  unit: Pick<Unit, "layoutImage" | "unitTypeId" | "unitNumber">,
  project: Pick<Project, "unitTypes"> | null | undefined,
  floorNumber?: number,
): ResolvedUnitPlan {
  if (unit.layoutImage) return { src: unit.layoutImage, source: "custom" };

  const types = project?.unitTypes ?? [];
  const chosen = unit.unitTypeId ? types.find((t) => t.id === unit.unitTypeId) : undefined;
  if (chosen?.image) return { src: chosen.image, source: "type", type: chosen };

  const matched = matchUnitType(unit.unitNumber, types, floorNumber);
  if (matched?.image) return { src: matched.image, source: "auto-type", type: matched };

  return { source: "none" };
}
