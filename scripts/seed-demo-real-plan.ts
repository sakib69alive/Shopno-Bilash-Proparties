/**
 * Local-only demo: "Shopno Heights" — built from a real architect's Ground Floor and Typical Floor plan (converted from the PDFs to
 * single-ink SVGs in public/uploads/demo/). Ground level + 4 typical floors × 3 flats (A=1,370 / B=1,690 / C=1,680 sqft), and the
 * demo owner (Rahim Uddin) owns flat 1A so the client app can be checked on a phone.
 *
 *   DATABASE_URL=file:./dev.db npx tsx scripts/seed-demo-real-plan.ts
 *
 * SQLite only and idempotent (upserts by id).
 */
import { PrismaClient } from "@prisma/client";
import process from "node:process";

if (!(process.env.DATABASE_URL ?? "").startsWith("file:")) {
  console.error("Refusing to seed: DATABASE_URL must be a local SQLite file (file:./dev.db).");
  process.exit(1);
}

const prisma = new PrismaClient();
const now = new Date().toISOString();
const audit = { createdAt: now, updatedAt: now, createdBy: "demo-seed" };
const PID = "demo-realplan";
const money = (amount: number) => ({ amount, currency: "BDT" });

type Model = "project" | "building" | "floor" | "unit" | "ownershipRecord" | "parking";
async function put(model: Model, id: string, data: Record<string, unknown>) {
  const d = { id, ...data, ...audit };
  await (prisma[model] as any).upsert({ where: { id }, update: { data: d }, create: { id, data: d } });
}

/** Parking bays on the ground plan (traced on its 2000×1280 preview): P-01…P-06 along the top row. */
const bay = (x0: number, x1: number): [number, number][] => [[x0, 168], [x1, 168], [x1, 372], [x0, 372]].map(([x, y]) => [Math.round((x / 2000) * 10000) / 10000, Math.round((y / 1280) * 10000) / 10000] as [number, number]);
const BAYS = [
  { kind: "parking", key: "P-01", points: bay(1022, 1102) },
  { kind: "parking", key: "P-02", points: bay(1125, 1203) },
  { kind: "parking", key: "P-03", points: bay(1230, 1307) },
  { kind: "parking", key: "P-04", points: bay(1362, 1440) },
  { kind: "parking", key: "P-05", points: bay(1470, 1548) },
  { kind: "parking", key: "P-06", points: bay(1577, 1655) },
];

/** Pixels of the 2000×1284 preview → 0–1 fractions of the drawing. */
const px = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [Math.round((x / 2000) * 10000) / 10000, Math.round((y / 1284) * 10000) / 10000]);

/** Flat A's rooms on the typical plan, as rectangles traced on the 2000×1284 preview → room polygons (0–1 fractions). */
const rect = (x0: number, y0: number, x1: number, y1: number): [number, number][] => px([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const TYPICAL_ROOMS = {
  aspect: 1000 / 642,
  rooms: [
    { id: "bed-1", label: "Bedroom 1", type: "bedroom", points: rect(1010, 182, 1210, 352) },
    { id: "bed-2", label: "Bedroom 2", type: "bedroom", points: rect(1218, 182, 1392, 352) },
    { id: "kitchen", label: "Kitchen", type: "kitchen", points: rect(1400, 182, 1490, 360) },
    { id: "bed-3", label: "Bedroom 3", type: "bedroom", points: rect(1500, 218, 1680, 408) },
    { id: "toilet-1", label: "Toilet 1", type: "bathroom", points: rect(1686, 218, 1788, 292) },
    { id: "balcony-1", label: "Balcony 1", type: "balcony", points: rect(1686, 300, 1752, 408) },
    { id: "bed-4", label: "Bedroom 4", type: "bedroom", points: rect(1500, 418, 1680, 586) },
    { id: "balcony-2", label: "Balcony 2", type: "balcony", points: rect(1686, 418, 1752, 500) },
    { id: "toilet-2", label: "Toilet 2", type: "bathroom", points: rect(1686, 508, 1788, 586) },
    { id: "drawing", label: "Drawing room", type: "living", points: rect(1008, 362, 1318, 584) },
    { id: "dining", label: "Dining", type: "dining", points: rect(1326, 362, 1494, 518) },
    { id: "toilet-3", label: "Toilet 3", type: "bathroom", points: rect(1328, 524, 1494, 586) },
  ],
};

/** Flat A's outline on the typical plan (0–1 fractions). */
const A_OUTLINE = px([[945, 140], [1125, 140], [1125, 175], [1495, 175], [1495, 210], [1795, 210], [1795, 590], [1000, 590], [1000, 250], [945, 250]]);

/** Flats B and C outlines on the typical plan (same as the client floor plan areas). */
const B_OUTLINE = px([[205, 80], [610, 80], [610, 100], [690, 100], [690, 130], [940, 130], [940, 250], [890, 250], [890, 590], [680, 590], [680, 520], [205, 520]]);
const C_OUTLINE = px([[205, 588], [675, 588], [675, 705], [940, 705], [940, 1100], [282, 1100], [282, 770], [205, 770]]);
const box = (x0: number, y0: number, x1: number, y1: number, h: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [Math.round((x / 2000) * 10000) / 10000, Math.round((y / h) * 10000) / 10000] as [number, number]);

/** What the PUBLIC project page offers on a building floor: its flats, lift and stairs (rooms belong to each flat's own page). */
const TYPICAL_BUILDING = {
  aspect: 1000 / 642,
  rooms: [
    { id: "flat-a", label: "Flat A", type: "flat", points: A_OUTLINE },
    { id: "flat-b", label: "Flat B", type: "flat", points: B_OUTLINE },
    { id: "flat-c", label: "Flat C", type: "flat", points: C_OUTLINE },
    { id: "lift", label: "Lift", type: "lift", points: box(900, 258, 995, 370, 1284) },
    { id: "stair", label: "Stair", type: "stair", points: box(595, 590, 875, 708, 1284) },
  ],
};
const GROUND_BUILDING = {
  aspect: 1000 / 640,
  rooms: [
    { id: "lift", label: "Lift", type: "lift", points: box(900, 245, 1000, 372, 1280) },
    { id: "stair", label: "Stair", type: "stair", points: box(675, 575, 880, 705, 1280) },
    { id: "gate", label: "Main gate", type: "gate", points: box(1690, 372, 1820, 568, 1280) },
    { id: "guard", label: "Guard post", type: "other", points: box(1690, 570, 1820, 662, 1280) },
    { id: "emr", label: "EMR room", type: "other", points: box(205, 80, 420, 300, 1280) },
    { id: "toilet", label: "Toilet", type: "bathroom", points: box(885, 125, 1008, 245, 1280) },
  ],
};

async function main() {
  const base = ((await prisma.project.findUnique({ where: { id: "demo-project" } }))?.data ?? {}) as Record<string, unknown>;
  await put("project", PID, {
    ...base,
    id: PID, code: "SHP-01", name: "Shopno Heights", slug: "shopno-heights",
    description: "Demo built from a real architect's plans: ground-level parking plus typical floors of three flats.",
    buildingCount: 1, floorCount: 5, unitCount: 13, parkingCount: 16, status: "ongoing", salesStatus: "open", isPublished: true,
    // Whole-floor plans: ground (floor 0) and the typical floor (every other floor), with flats A/B/C marked on the typical one.
    // Points are traced on the 2000×1284 preview of the SVG and stored as 0–1 fractions.
    floorPlans: [
      { id: "shp-fp-ground", name: "Ground floor", image: "/uploads/demo/real-ground-floor.svg", aspect: 1000 / 640, floors: [0], areas: BAYS },
      {
        id: "shp-fp-typical", name: "Typical floor", image: "/uploads/demo/real-typical-floor.svg", aspect: 1000 / 642, floors: [], rooms: [...TYPICAL_ROOMS.rooms, ...TYPICAL_BUILDING.rooms.filter((r) => r.type === "lift" || r.type === "stair")],
        areas: [
          { key: "B", points: px([[205, 80], [610, 80], [610, 100], [690, 100], [690, 130], [940, 130], [940, 250], [890, 250], [890, 590], [680, 590], [680, 520], [205, 520]]) },
          { key: "A", points: A_OUTLINE },
          { key: "C", points: px([[205, 588], [675, 588], [675, 705], [940, 705], [940, 1100], [282, 1100], [282, 770], [205, 770]]) },
        ],
      },
    ],
  });
  await put("building", "shp-b1", { projectId: PID, name: "Main Building", status: "under-construction", floorCount: 5, gallery: [] });

  await put("floor", "shp-f0", { projectId: PID, buildingId: "shp-b1", label: "Ground Floor", floorNumber: 0, unitCount: 1 });
  await put("unit", "shp-u-G", {
    projectId: PID, buildingId: "shp-b1", floorId: "shp-f0", unitNumber: "G-01", sizeSqft: 0, bedrooms: 0, bathrooms: 1, balconies: 0, parkingSpaces: 16,
    basePrice: money(0), additionalCharges: money(0), discount: money(0), finalPrice: money(0), status: "available",
  });

  const sizes: Record<string, number> = { A: 1370, B: 1690, C: 1690 };
  for (let f = 1; f <= 4; f++) {
    await put("floor", `shp-f${f}`, { projectId: PID, buildingId: "shp-b1", label: `Floor ${f}`, floorNumber: f, unitCount: 3 });
    for (const letter of ["A", "B", "C"]) {
      const id = `shp-u-${f}${letter}`;
      const mine = f === 1 && letter === "A";
      await put("unit", id, {
        projectId: PID, buildingId: "shp-b1", floorId: `shp-f${f}`, unitNumber: `${f}${letter}`, sizeSqft: sizes[letter],
        bedrooms: 3, bathrooms: 3, balconies: 1, parkingSpaces: 1,
        basePrice: money(sizes[letter] * 7500), additionalCharges: money(0), discount: money(0), finalPrice: money(sizes[letter] * 7500),
        status: mine ? "sold" : "available", ...(mine ? { customerId: "demo-customer" } : {}),
      });
    }
  }
  await put("ownershipRecord", "shp-or-1A", { targetType: "unit", targetId: "shp-u-1A", projectId: PID, ownerType: "customer", ownerId: "demo-customer", source: "sale", startDate: now });
  // Public website entry (Website CMS layer — separate from the business project above): shows the two real plans under Projects → Building blueprints.
  const cms = ((await prisma.projectContent.findUnique({ where: { id: "p1" } }))?.data ?? {}) as Record<string, unknown>;
  const cmsData = {
    ...cms,
    id: "p-shopno-heights", name: "Shopno Heights", slug: "shopno-heights", status: "ongoing", featured: false, sortOrder: undefined,
    shortDescription: "Three-flat typical floors above a ground-level parking court, built from the architect's real plans.",
    description: "Shopno Heights has a ground-level parking court and typical floors of three flats each, with a shared lift and stair core.",
    totalUnits: 12, availableUnits: 11, floors: 5, unitTypes: ["3 Bed"],
    blueprints: [
      { kind: "garage", label: "Ground floor", image: { src: "/uploads/demo/real-ground-floor.svg", alt: "Ground floor plan of Shopno Heights" }, planRooms: GROUND_BUILDING },
      { kind: "floor", label: "Typical floor (1–4)", image: { src: "/uploads/demo/real-typical-floor.svg", alt: "Typical floor plan of Shopno Heights" }, planRooms: TYPICAL_BUILDING },
    ],
    ...audit,
  };
  await prisma.projectContent.upsert({ where: { id: "p-shopno-heights" }, update: { data: cmsData as object }, create: { id: "p-shopno-heights", data: cmsData as object } });
  // A public unit page that uses the same plan with its rooms, to try the room buttons on the Properties side too.
  const unitRow = (await prisma.unitContent.findFirst())?.data as Record<string, unknown> | undefined;
  if (unitRow) {
    const unitData = {
      ...unitRow, id: "u-shp-1a", projectSlug: "shopno-heights", name: "Shopno Heights 1A", slug: "shopno-heights-1a", unitNumber: "1A", unitType: "3 Bed", floor: 1,
      bedrooms: 4, bathrooms: 3, balconies: 2, status: "available", sortOrder: undefined,
      floorPlan: { src: "/uploads/demo/real-typical-floor.svg", alt: "Floor plan of Shopno Heights 1A" }, floorPlanRooms: TYPICAL_ROOMS, floorPlanFlat: { aspect: 1000 / 642, points: A_OUTLINE }, ...audit,
    };
    await prisma.unitContent.upsert({ where: { id: "u-shp-1a" }, update: { data: unitData as object }, create: { id: "u-shp-1a", data: unitData as object } });
  }
  // Parking: P-01…P-03 belong to the demo owner, P-04…P-06 are free (so the plan shows his bays lit and the rest dimmed).
  for (let p = 1; p <= 6; p++) {
    const mine = p <= 3;
    await put("parking", `shp-p${p}`, { projectId: PID, buildingId: "shp-b1", parkingNumber: `P-0${p}`, type: "car", status: mine ? "assigned" : "available", ...(mine ? { ownerType: "customer", ownerId: "demo-customer" } : {}) });
    if (mine) await put("ownershipRecord", `shp-or-p${p}`, { targetType: "parking", targetId: `shp-p${p}`, projectId: PID, ownerType: "customer", ownerId: "demo-customer", source: "manual", startDate: now });
  }
  console.log("Seeded Shopno Heights: ground level + 4 typical floors × 3 flats.");
}

main().finally(() => prisma.$disconnect());
