import "server-only";
import { randomUUID } from "node:crypto";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { parkingRepository } from "@/features/parking/repository";
import type { ID } from "@/types/common";

/** One "this floor (or run of floors) is different" row from the New Project form. */
export interface FloorException {
  fromFloor: number;
  toFloor: number;
  units: number;
  sqft?: number;
}

export interface StructureSpec {
  buildings: number;
  floors: number;
  /** Typical number of flats on a floor. */
  unitsPerFloor: number;
  /** Typical flat size; flats are created with it so owners' sqft can be added up right away. Editable per flat later. */
  avgSqft?: number;
  exceptions: FloorException[];
  parkingSpaces: number;
}

export interface StructureResult {
  buildings: number;
  floors: number;
  units: number;
  parking: number;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function letters(index: number): string {
  let n = index;
  let out = "";
  do {
    out = ALPHABET[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

const MAX_UNITS = 2000;

/** Flats on a given floor, and their size, after applying any exception rows (later rows win). */
export function floorPlan(spec: StructureSpec, floorNumber: number): { units: number; sqft?: number } {
  let units = spec.unitsPerFloor;
  let sqft = spec.avgSqft;
  for (const ex of spec.exceptions) {
    if (floorNumber >= ex.fromFloor && floorNumber <= ex.toFloor) {
      units = ex.units;
      sqft = ex.sqft ?? sqft;
    }
  }
  return { units, sqft };
}

export function validateStructure(spec: StructureSpec): string | null {
  if (spec.buildings < 1 || spec.buildings > 20) return "Buildings must be between 1 and 20.";
  if (spec.floors < 1 || spec.floors > 100) return "Floors must be between 1 and 100.";
  if (spec.unitsPerFloor < 0 || spec.unitsPerFloor > 50) return "Flats per floor must be between 0 and 50.";
  if (spec.parkingSpaces < 0 || spec.parkingSpaces > 500) return "Parking spaces must be between 0 and 500.";
  for (const ex of spec.exceptions) {
    if (ex.fromFloor < 1 || ex.toFloor > spec.floors || ex.fromFloor > ex.toFloor) {
      return `A "different floor" row points at floor ${ex.fromFloor === ex.toFloor ? ex.fromFloor : `${ex.fromFloor}-${ex.toFloor}`}, which this project doesn't have (it has ${spec.floors} floors).`;
    }
    if (ex.units < 0 || ex.units > 50) return "Flats on a different floor must be between 0 and 50.";
  }
  let total = 0;
  for (let f = 1; f <= spec.floors; f++) total += floorPlan(spec, f).units;
  if (total * spec.buildings > MAX_UNITS) return `That makes ${total * spec.buildings} flats — please keep it under ${MAX_UNITS}.`;
  return null;
}

/**
 * Builds the Building → Floor → Flat tree (and the parking spaces) for a
 * brand-new project from a few numbers, so nobody has to add them one at a
 * time afterwards. Everything created is an ordinary record: rename, resize
 * or delete any floor/flat/space individually later — nothing here enforces
 * that the building stays regular.
 */
export async function generateProjectStructure(projectId: ID, userId: ID, spec: StructureSpec): Promise<StructureResult> {
  const now = new Date().toISOString();
  const result: StructureResult = { buildings: 0, floors: 0, units: 0, parking: 0 };

  for (let b = 0; b < (spec.floors > 0 ? spec.buildings : 0); b++) {
    const buildingId = randomUUID();
    const code = letters(b);
    const multiple = spec.buildings > 1;
    await buildingRepository.create({
      id: buildingId,
      projectId,
      name: multiple ? `Building ${code}` : "Main Building",
      code: multiple ? code : undefined,
      status: "planning",
      floorCount: spec.floors,
      gallery: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });
    result.buildings += 1;

    for (let floorNumber = 1; floorNumber <= spec.floors; floorNumber++) {
      const plan = floorPlan(spec, floorNumber);
      const floorId = randomUUID();
      await floorRepository.create({
        id: floorId,
        projectId,
        buildingId,
        label: `Floor ${floorNumber}`,
        floorNumber,
        unitCount: plan.units,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      });
      result.floors += 1;

      for (let u = 0; u < plan.units; u++) {
        await unitRepository.create({
          id: randomUUID(),
          projectId,
          buildingId,
          floorId,
          unitNumber: `${multiple ? `${code}-` : ""}${floorNumber}${letters(u)}`,
          sizeSqft: plan.sqft ?? 0,
          bedrooms: 0,
          bathrooms: 0,
          balconies: 0,
          parkingSpaces: 0,
          basePrice: { amount: 0, currency: "BDT" },
          additionalCharges: { amount: 0, currency: "BDT" },
          discount: { amount: 0, currency: "BDT" },
          finalPrice: { amount: 0, currency: "BDT" },
          status: "available",
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        });
        result.units += 1;
      }
    }
  }

  for (let p = 1; p <= spec.parkingSpaces; p++) {
    await parkingRepository.create({
      id: randomUUID(),
      projectId,
      parkingNumber: `P-${String(p).padStart(2, "0")}`,
      type: "car",
      status: "available",
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });
    result.parking += 1;
  }

  return result;
}

/** Reads the structure fields from the New Project form. Returns `null` when the "build it now" switch is off or nothing was entered. */
export function parseStructureSpec(formData: FormData): { spec: StructureSpec } | { error: string } | null {
  if (formData.get("generateStructure") !== "on") return null;

  const num = (name: string, fallback = 0) => {
    const raw = String(formData.get(name) ?? "").trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  };

  const floors = num("floorCount");
  const parkingSpaces = num("parkingCount");
  if (floors === 0 && parkingSpaces === 0) return null;

  const exFloor = formData.getAll("exFloor").map((v) => String(v).trim());
  const exUnits = formData.getAll("exUnits").map((v) => String(v).trim());
  const exSqft = formData.getAll("exSqft").map((v) => String(v).trim());
  const exceptions: FloorException[] = [];
  for (let i = 0; i < exFloor.length; i++) {
    if (!exFloor[i] && !exUnits[i]) continue;
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(exFloor[i]);
    if (!match) return { error: `"${exFloor[i] || "?"}" isn't a floor number — use 5 or 9-10.` };
    if (exUnits[i] === "") return { error: `Enter how many flats floor ${exFloor[i]} has.` };
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;
    const sqft = exSqft[i] ? Number(exSqft[i]) : undefined;
    exceptions.push({ fromFloor: from, toFloor: to, units: Math.floor(Number(exUnits[i])), sqft: sqft && Number.isFinite(sqft) ? sqft : undefined });
  }

  const avgSqft = num("avgSqft");
  const spec: StructureSpec = {
    buildings: Math.max(1, num("buildingCount", 1)),
    floors,
    unitsPerFloor: num("unitsPerFloor"),
    avgSqft: avgSqft > 0 ? avgSqft : undefined,
    exceptions,
    parkingSpaces,
  };

  if (floors === 0) return { spec: { ...spec, floors: 0, unitsPerFloor: 0, exceptions: [] } };
  const problem = validateStructure(spec);
  return problem ? { error: problem } : { spec };
}
