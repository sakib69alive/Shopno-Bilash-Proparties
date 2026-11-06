/**
 * Local-only demo: "Lakeview Heights" — 10 floors × 4 flats (A=1,000 / B=2,000
 * / C=3,000 / D=4,000 sqft = 40 flats), 37 different owners (34 own one flat,
 * 3 own two), 16 parking spaces (12 of them already belong to owners).
 * Owners are a mix of customers, shareholders and landowners, so the Distribute
 * board and the Split Planner can be tried on realistic numbers.
 *
 *   DATABASE_URL=file:./dev.db npx tsx scripts/seed-demo-tower.ts
 *
 * SQLite only (refuses anything else) and idempotent: it upserts by id.
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
const PID = "demo-lakeview";

type Model =
  | "project" | "building" | "floor" | "unit" | "parking" | "customer" | "shareholder" | "shareholding"
  | "landowner" | "agreement" | "landownerAllocation" | "ownershipRecord";

async function put(model: Model, id: string, data: Record<string, unknown>) {
  const d = { id, ...data, ...audit };
  await (prisma[model] as any).upsert({ where: { id }, update: { data: d }, create: { id, data: d } });
}

const FIRST = ["Rahim", "Karim", "Jamal", "Nasir", "Faruk", "Habib", "Sohel", "Imran", "Tanvir", "Mizan", "Arif", "Shakil", "Rubel", "Kamal", "Sajib", "Monir", "Alamgir", "Jahid", "Masud", "Ripon", "Nazmul", "Babul", "Hasan", "Delwar", "Salam", "Anwar", "Shafiq", "Rafiq", "Touhid", "Emon", "Parvez", "Sabbir", "Liton", "Mamun", "Zahid", "Rony", "Shahin"];
const LAST = ["Uddin", "Hossain", "Ahmed", "Rahman", "Chowdhury", "Islam", "Khan", "Miah", "Sarker", "Mollah"];
const names = FIRST.map((f, i) => `${f} ${LAST[(i * 3) % LAST.length]}`);

async function main() {
  const base = ((await prisma.project.findUnique({ where: { id: "demo-project" } }))?.data ?? {}) as Record<string, unknown>;
  await put("project", PID, {
    ...base,
    id: PID, code: "LKV-01", name: "Lakeview Heights", slug: "lakeview-heights",
    description: "Demo tower: 10 floors, 4 flats per floor, 16 parking spaces.",
    buildingCount: 1, floorCount: 10, unitCount: 40, parkingCount: 16, status: "ongoing", salesStatus: "open", isPublished: false,
  });
  await put("building", "lkv-b1", { projectId: PID, name: "Main Building", status: "under-construction", floorCount: 10, gallery: [] });

  // 40 flats, floor by floor: A=1000, B=2000, C=3000, D=4000 sqft.
  const sizes: Record<string, number> = { A: 1000, B: 2000, C: 3000, D: 4000 };
  const units: { id: string; floor: number; letter: string; number: string; sqft: number }[] = [];
  for (let f = 1; f <= 10; f++) {
    await put("floor", `lkv-f${f}`, { projectId: PID, buildingId: "lkv-b1", label: `Floor ${f}`, floorNumber: f, unitCount: 4 });
    for (const letter of ["A", "B", "C", "D"]) units.push({ id: `lkv-u-${f}${letter}`, floor: f, letter, number: `${f}${letter}`, sqft: sizes[letter] });
  }

  // 37 owners: customers 1–24, shareholders 25–33, landowners 34–37. Flats are handed out in a scrambled (but repeatable) order.
  const order = units.map((_, i) => i).sort((a, b) => ((a * 17) % 41) - ((b * 17) % 41));
  const owners = names.map((name, i) => ({ id: `lkv-o${i + 1}`, name, kind: (i < 24 ? "customer" : i < 33 ? "shareholder" : "landowner") as "customer" | "shareholder" | "landowner", phone: `0171${String(1000000 + i * 7919).slice(0, 7)}` }));
  // First 37 flats go one each; the last 3 go to owners #4, #21 and #32 (so those three own two flats).
  const extraOwnerIdx = [3, 20, 31];
  const holder = (k: number) => (k < 37 ? owners[k] : owners[extraOwnerIdx[k - 37]]);

  for (const o of owners) {
    if (o.kind === "customer") await put("customer", o.id, { name: o.name, email: `${o.id}@demo.test`, phone: o.phone, status: "active", unitIds: [] });
    if (o.kind === "shareholder") {
      await put("shareholder", o.id, { name: o.name, email: `${o.id}@demo.test`, phone: o.phone });
      await put("shareholding", `${o.id}-h`, { shareholderId: o.id, projectId: PID, sharePercentage: 2, totalContribution: { amount: 0, currency: "BDT" }, allocatedUnitIds: [] });
    }
    if (o.kind === "landowner") {
      await put("landowner", o.id, { name: o.name, email: `${o.id}@demo.test`, phone: o.phone, propertyIds: [] });
      await put("agreement", `${o.id}-a`, { landownerId: o.id, projectId: PID, status: "active", termsSummary: "Receives flats in the finished building", documentIds: [] });
    }
  }

  const holdingUnits = new Map<string, string[]>();
  for (let k = 0; k < order.length; k++) {
    const unit = units[order[k]];
    const o = holder(k);
    const fields: Record<string, unknown> = {};
    let source: "sale" | "shareholding" | "landowner-allocation" = "sale";
    let sourceRecordId: string | undefined;
    let status = "sold";
    if (o.kind === "customer") fields.customerId = o.id;
    if (o.kind === "shareholder") {
      fields.shareholderId = o.id; source = "shareholding"; sourceRecordId = `${o.id}-h`; status = "allocated";
      holdingUnits.set(o.id, [...(holdingUnits.get(o.id) ?? []), unit.id]);
    }
    if (o.kind === "landowner") {
      const allocId = `lkv-la-${unit.id}`;
      await put("landownerAllocation", allocId, { agreementId: `${o.id}-a`, landownerId: o.id, unitId: unit.id });
      fields.landownerAllocationId = allocId; source = "landowner-allocation"; sourceRecordId = allocId; status = "allocated";
    }
    await put("unit", unit.id, {
      projectId: PID, buildingId: "lkv-b1", floorId: `lkv-f${unit.floor}`, unitNumber: unit.number, sizeSqft: unit.sqft,
      bedrooms: 3, bathrooms: 2, balconies: 1, parkingSpaces: 0,
      basePrice: { amount: 0, currency: "BDT" }, additionalCharges: { amount: 0, currency: "BDT" }, discount: { amount: 0, currency: "BDT" }, finalPrice: { amount: 0, currency: "BDT" },
      status, ...fields,
    });
    await put("ownershipRecord", `lkv-or-${unit.id}`, { targetType: "unit", targetId: unit.id, projectId: PID, ownerType: o.kind, ownerId: o.id, source, sourceRecordId, startDate: now });
  }
  for (const [shareholderId, ids] of holdingUnits) {
    const row = await prisma.shareholding.findUnique({ where: { id: `${shareholderId}-h` } });
    await prisma.shareholding.update({ where: { id: `${shareholderId}-h` }, data: { data: { ...(row!.data as object), allocatedUnitIds: ids } } });
  }

  // 16 parking spaces; 12 already belong to owners (every third owner, plus the three double-flat owners).
  const parkingOwners = [...extraOwnerIdx, ...Array.from({ length: 9 }, (_, i) => i * 4)];
  for (let p = 1; p <= 16; p++) {
    const o = p <= 12 ? owners[parkingOwners[p - 1]] : undefined;
    await put("parking", `lkv-p${p}`, { projectId: PID, buildingId: "lkv-b1", parkingNumber: `P-${String(p).padStart(2, "0")}`, type: "car", status: o ? "assigned" : "available", ...(o ? { ownerType: o.kind, ownerId: o.id } : {}) });
    if (o) await put("ownershipRecord", `lkv-or-p${p}`, { targetType: "parking", targetId: `lkv-p${p}`, projectId: PID, ownerType: o.kind, ownerId: o.id, source: "manual", startDate: now });
  }
  console.log(`Seeded Lakeview Heights: 40 flats, ${owners.length} owners, 16 parking (12 owned).`);
}

main().finally(() => prisma.$disconnect());
