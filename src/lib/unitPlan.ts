import type { BuildingFloorPlan, FlatArea, Project, UnitType } from "@/types/project";
import { buildingLevel, flatLevelRooms, normalizeAreaKey, roomsInside, type PlanRoom, type PlanView } from "@/lib/planRooms";
import type { Unit } from "@/types/unit";

/**
 * Which blueprint a flat shows. Resolved at read time (never copied onto the
 * flat), so editing a type's image or code updates every flat that uses it:
 *
 *   1. the flat's own custom plan (`Unit.layoutImage`)
 *   1b. the building's whole-floor plan for the flat's floor (`Project.floorPlans`) — with the flat's own area marked,
 *       so the owner sees their flat lit up among the others
 *   2. the type chosen for it explicitly (`Unit.unitTypeId`)
 *   3. the type whose position code matches the flat number — "A" for 1A,
 *      2A, 3A… (see `unitPositionKeys`)
 *   4. nothing
 */
export type UnitPlanSource = "custom" | "floor-plan" | "type" | "auto-type" | "none";

/** What to light up on a whole-floor plan: the flat's own area(s) and the other flats' areas (to dim). */
export interface PlanHighlight {
  aspect: number;
  mine: FlatArea[];
  others: FlatArea[];
  /** The rooms inside the flat (from the floor plan's rooms) — the Home screen turns them into room buttons. */
  rooms?: PlanRoom[];
  /** What the whole-floor card offers as buttons: this flat and the other flats ("Flat 1A", "Flat 1B"…), the lift, the stair — never rooms. */
  buildingItems?: PlanRoom[];
  /** The admin's own tilt / zoom / shift of the plan. */
  view?: PlanView;
  /** The admin's own zoom / shift of this flat on the client's Home card. */
  homeView?: PlanView;
}

export interface ResolvedUnitPlan {
  src?: string;
  source: UnitPlanSource;
  type?: UnitType;
  /** Set for a whole-floor plan; absent when the flat's own area was never marked (the plan is then shown plain). */
  highlight?: PlanHighlight;
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

/** The building plan for a floor: one that lists the floor, else the "every other floor" plan (empty floor list). */
export function pickFloorPlan(plans: BuildingFloorPlan[] | undefined, floorNumber: number | undefined): BuildingFloorPlan | undefined {
  const withImage = (plans ?? []).filter((p) => p.image);
  if (floorNumber !== undefined) {
    const exact = withImage.find((p) => p.floors.includes(floorNumber));
    if (exact) return exact;
  }
  return withImage.find((p) => p.floors.length === 0);
}

/** Does this area belong to the flat? Compared the same way unit types are: against every repeating part of the flat number. */
function areaMatches(area: FlatArea, keys: string[]): boolean {
  if (area.kind === "parking") return false;
  const k = area.key.trim().toUpperCase();
  return k !== "" && keys.includes(k);
}

export function resolveUnitPlan(
  unit: Pick<Unit, "layoutImage" | "unitTypeId" | "unitNumber"> & { hidePlanFromOwner?: boolean; planFloorPlanId?: string },
  project: Pick<Project, "unitTypes" | "floorPlans"> | null | undefined,
  floorNumber?: number,
  opts?: { forOwner?: boolean },
): ResolvedUnitPlan {
  if (opts?.forOwner && unit.hidePlanFromOwner) return { source: "none" };
  if (unit.layoutImage) return { src: unit.layoutImage, source: "custom" };

  // A plan the admin handed to this client by name (Blueprint AI → Distribution) beats the automatic per-floor pick.
  const chosenPlan = unit.planFloorPlanId ? project?.floorPlans?.find((p) => p.id === unit.planFloorPlanId && p.image) : undefined;
  const floorPlan = chosenPlan ?? pickFloorPlan(project?.floorPlans, floorNumber);
  if (floorPlan) {
    const keys = unitPositionKeys(unit.unitNumber, floorNumber);
    const mine = floorPlan.areas.filter((a) => areaMatches(a, keys));
    const others = floorPlan.areas.filter((a) => !mine.includes(a));
    const floorText = floorNumber === undefined ? "" : String(floorNumber);
    const flatItems: PlanRoom[] = floorPlan.areas
      .filter((a) => a.kind !== "parking" && a.points.length >= 3)
      .map((a) => ({ id: `flat-${a.key}`, label: `Flat ${floorText}${a.key}${mine.includes(a) ? " (yours)" : ""}`, type: "flat" as const, points: a.points }));
    const sharedItems = (buildingLevel(floorPlan.rooms ? { aspect: floorPlan.aspect, rooms: floorPlan.rooms } : undefined)?.rooms ?? []).filter((r) => r.type !== "flat");
    const buildingItems = [...flatItems, ...sharedItems];
    return { src: floorPlan.image, source: "floor-plan", highlight: mine.length > 0 ? { aspect: floorPlan.aspect, mine, others, buildingItems, rooms: floorPlan.rooms ? flatLevelRooms(roomsInside(floorPlan.rooms, mine[0].points)) : undefined, view: floorPlan.view, homeView: floorPlan.homeView } : undefined };
  }

  const types = project?.unitTypes ?? [];
  const chosen = unit.unitTypeId ? types.find((t) => t.id === unit.unitTypeId) : undefined;
  if (chosen?.image) return { src: chosen.image, source: "type", type: chosen };

  const matched = matchUnitType(unit.unitNumber, types, floorNumber);
  if (matched?.image) return { src: matched.image, source: "auto-type", type: matched };

  return { source: "none" };
}

/**
 * Where the owner's parking bays are: the plan (usually the ground floor) that has parking bays marked, with the owner's own bays lit
 * and the other bays dimmed. Bays are matched by number ("P-01" = "p01"). Returns nothing when no plan marks any of these spaces.
 */
export function resolveParkingPlan(
  spaces: { parkingNumber: string }[],
  project: Pick<Project, "floorPlans"> | null | undefined,
): { src: string; highlight: PlanHighlight } | undefined {
  const wanted = new Set(spaces.map((s) => normalizeAreaKey(s.parkingNumber)));
  for (const plan of project?.floorPlans ?? []) {
    if (!plan.image) continue;
    const bays = plan.areas.filter((a) => a.kind === "parking");
    const mine = bays.filter((a) => wanted.has(normalizeAreaKey(a.key)));
    if (mine.length === 0) continue;
    return { src: plan.image, highlight: { aspect: plan.aspect, mine, others: plan.areas.filter((a) => !mine.includes(a)), view: plan.view } };
  }
  return undefined;
}

/** Which flat marker of a whole-floor drawing is this flat's? Matched the same way unit types are: by the repeating part of the flat number (1A → "A"). */
export function pickFlatMarker<T extends { kind: "flat" | "parking"; key: string }>(areas: T[], unitNumber: string, floorNumber?: number): T | undefined {
  const keys = unitPositionKeys(unitNumber, floorNumber);
  return areas.find((a) => a.kind === "flat" && keys.includes(a.key.trim().toUpperCase()));
}
