/**
 * Local-only demo content for visual QA of the mobile-first redesign
 * (docs/mobile-first-plan.md): Unsplash photos, four projects, a few news
 * articles, and placeholder contact numbers, so the public pages have
 * something to render at phone width.
 *
 *   npx tsx scripts/seed-demo.ts
 *
 * Refuses to run against anything but a SQLite file — this must never
 * reach the live (Postgres) database, where demo photos and fake phone
 * numbers would show up on the real site. Idempotent: it upserts by id,
 * so running it again just resets the demo rows.
 */
import { PrismaClient } from "@prisma/client";
import process from "node:process";

const url = process.env.DATABASE_URL ?? "";
if (!url.startsWith("file:")) {
  console.error(`Refusing to seed demo data: DATABASE_URL must be a local SQLite file (file:./dev.db), got "${url.split(":")[0] || "(unset)"}".`);
  process.exit(1);
}

const prisma = new PrismaClient();

const photo = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
const img = (id: string, alt: string) => ({ src: photo(id), alt });

const PHOTOS = {
  towerA: "1545324418-cc1a3fa10c00",
  glassOffice: "1486406146926-c627a92ad1ab",
  modernHouse: "1512917774080-9991f1c4c750",
  villaPool: "1600596542815-ffad4c1539a9",
  houseDusk: "1600585154340-be6161a56a0c",
  livingRoom: "1560448204-e02f11c3d0e2",
  interiorBright: "1502672260266-1c1ef2d93688",
  apartment: "1493809842364-78817add7ffb",
  facade: "1564013799919-ab600027ffc6",
  suburbHouse: "1570129477492-45c003edd2be",
  lounge: "1554995207-c18c203602cb",
  flatBalcony: "1522708323590-d24dbb6b0267",
  cityBlock: "1448630360428-65456885c650",
  apartmentsRow: "1460317442991-0ec209397118",
  field: "1500382017468-9049fed747ef",
  construction: "1486325212027-8081e485255e",
} as const;

const now = new Date().toISOString();

// Garage → floor → roof blueprints (SVGs in public/uploads/demo/, local only).
const blueprints = (name: string) => [
  { kind: "garage", label: "Garage", image: { src: "/uploads/demo/building-garage.svg", alt: `Garage blueprint of ${name}` } },
  { kind: "floor", label: "Typical floor", image: { src: "/uploads/demo/building-floor.svg", alt: `Floor blueprint of ${name}` } },
  { kind: "roof", label: "Roof", image: { src: "/uploads/demo/building-roof.svg", alt: `Roof blueprint of ${name}` } },
];

const projects = [
  {
    id: "p1",
    name: "Meridian Residences",
    slug: "meridian-residences",
    location: "Gulshan 2, Dhaka",
    city: "Dhaka",
    projectType: "Residential",
    status: "ongoing",
    shortDescription: "A quiet, light-filled apartment building on a leafy Gulshan street.",
    description:
      "Meridian Residences is a ten-storey apartment building planned around natural light and cross ventilation.\n\nEvery home has a generous balcony, and the ground floor is given over to a landscaped courtyard shared by all residents.",
    concept: "Homes that open to the sky.",
    coverImage: img(PHOTOS.towerA, "Meridian Residences facade"),
    gallery: [
      img(PHOTOS.towerA, "Meridian Residences facade"),
      img(PHOTOS.apartmentsRow, "Meridian Residences street view"),
      img(PHOTOS.livingRoom, "Living room concept"),
      img(PHOTOS.flatBalcony, "Balcony concept"),
      img(PHOTOS.interiorBright, "Interior concept"),
    ],
    completionYear: 2027,
    totalUnits: 40,
    availableUnits: 12,
    unitTypes: ["2 Bed", "3 Bed", "Duplex"],
    floors: 10,
    area: "0.4 acre",
    buildingType: "Residential apartment",
    features: ["Courtyard garden", "Underground parking", "Rooftop terrace"],
    locationDescription: "Gulshan 2, Dhaka",
    featured: true,
  },
  {
    id: "p2",
    name: "Harbor View Commercial",
    slug: "harbor-view-commercial",
    location: "Agrabad, Chattogram",
    city: "Chattogram",
    projectType: "Commercial",
    status: "near-completion",
    shortDescription: "Retail and office floors in Chattogram's business district.",
    description:
      "Harbor View Commercial puts street-level retail under four floors of flexible office space.\n\nThe glazed frontage faces the port road and brings daylight deep into every floor.",
    coverImage: img(PHOTOS.glassOffice, "Harbor View Commercial"),
    gallery: [img(PHOTOS.glassOffice, "Harbor View Commercial"), img(PHOTOS.cityBlock, "Street elevation")],
    completionYear: 2026,
    totalUnits: 18,
    availableUnits: 5,
    unitTypes: ["Retail", "Office"],
    floors: 6,
    buildingType: "Commercial",
    featured: true,
  },
  {
    id: "p3",
    name: "The Grove",
    slug: "the-grove",
    location: "Bashundhara R/A, Dhaka",
    city: "Dhaka",
    projectType: "Residential",
    status: "completed",
    shortDescription: "A finished low-rise community around a shared courtyard.",
    description: "The Grove is a completed low-rise community of family apartments around a planted courtyard.",
    coverImage: img(PHOTOS.facade, "The Grove"),
    gallery: [img(PHOTOS.facade, "The Grove"), img(PHOTOS.suburbHouse, "The Grove courtyard")],
    completionYear: 2024,
    totalUnits: 24,
    availableUnits: 0,
    unitTypes: ["3 Bed"],
    floors: 5,
    buildingType: "Residential apartment",
    featured: false,
  },
  {
    id: "p4",
    name: "Riverside Plots",
    slug: "riverside-plots",
    location: "Purbachal, Dhaka",
    city: "Dhaka",
    projectType: "Land",
    status: "upcoming",
    shortDescription: "Planned residential plots with road access and drainage.",
    description: "Riverside Plots is a planned plot development with paved roads, drainage and utility connections.",
    coverImage: img(PHOTOS.field, "Riverside Plots"),
    gallery: [img(PHOTOS.field, "Riverside Plots"), img(PHOTOS.construction, "Site works")],
    totalUnits: 60,
    availableUnits: 8,
    unitTypes: ["Plot"],
    featured: false,
  },
];

const unitImages: Record<string, { cover: string; gallery: string[] }> = {
  u1: { cover: PHOTOS.livingRoom, gallery: [PHOTOS.livingRoom, PHOTOS.interiorBright, PHOTOS.lounge, PHOTOS.flatBalcony] },
  u2: { cover: PHOTOS.apartment, gallery: [PHOTOS.apartment] },
  u3: { cover: PHOTOS.modernHouse, gallery: [] },
  u4: { cover: PHOTOS.cityBlock, gallery: [PHOTOS.cityBlock, PHOTOS.glassOffice] },
  u5: { cover: PHOTOS.glassOffice, gallery: [PHOTOS.glassOffice] },
  u6: { cover: PHOTOS.suburbHouse, gallery: [PHOTOS.suburbHouse] },
  u7: { cover: PHOTOS.field, gallery: [PHOTOS.field] },
  u8: { cover: PHOTOS.field, gallery: [PHOTOS.field] },
};

// SVG blueprints generated into public/uploads/demo/ (gitignored, local only).
const floorPlans: Record<string, string> = {
  u1: "plan-3bed",
  u2: "plan-2bed",
  u3: "plan-3bed",
  u4: "plan-commercial",
  u5: "plan-commercial",
  u6: "plan-3bed",
  u7: "plan-plot",
  u8: "plan-plot",
};

const galleryImages: Record<string, string> = {
  g1: PHOTOS.towerA,
  g2: PHOTOS.construction,
  g3: PHOTOS.cityBlock,
  g4: PHOTOS.suburbHouse,
  g5: PHOTOS.construction,
  g6: PHOTOS.lounge,
  g7: PHOTOS.construction,
  g8: PHOTOS.interiorBright,
  g9: PHOTOS.field,
  g10: PHOTOS.construction,
};

const news = [
  {
    id: "n1",
    slug: "meridian-residences-reaches-fifth-floor",
    title: "Meridian Residences reaches its fifth floor",
    category: "Construction",
    date: "2026-10-12",
    excerpt: "The structural frame is now half way up, on schedule.",
    coverImage: img(PHOTOS.construction, "Structural frame"),
    content: ["The structural frame of Meridian Residences has reached its fifth floor.", "Work continues on schedule."],
    projectSlug: "meridian-residences",
    featured: true,
  },
  {
    id: "n2",
    slug: "harbor-view-handover-plan",
    title: "Harbor View handover plan",
    category: "Projects",
    date: "2026-09-28",
    excerpt: "What buyers can expect over the final months before handover.",
    coverImage: img(PHOTOS.glassOffice, "Harbor View Commercial"),
    content: ["Finishing works on Harbor View Commercial are under way.", "We will contact each buyer about handover."],
    projectSlug: "harbor-view-commercial",
    featured: false,
  },
  {
    id: "n3",
    slug: "site-visit-day",
    title: "Open site visit day",
    category: "Events",
    date: "2026-09-05",
    excerpt: "Landowners and buyers walked the Purbachal site with our team.",
    coverImage: img(PHOTOS.field, "Site visit"),
    content: ["Our team hosted an open site visit at the Purbachal land."],
    featured: false,
  },
];

/**
 * Extra units so each project's "available" count matches the units that can
 * actually be listed — the count shown on a project is a number typed in
 * admin, the list comes from individual unit records, and a demo where they
 * disagree looks broken. Meridian: 12 available (A-502 plus 11 here),
 * Harbor View: 5 (G-04 plus 4), Riverside: 8 (R-12, R-18 plus 6).
 */
function generatedUnits() {
  const facings = ["South", "South-East", "East", "North-East", "West"];
  const meridian = Array.from({ length: 11 }, (_, i) => {
    const floor = 2 + (i % 8);
    const letter = String.fromCharCode(65 + (i % 4));
    const beds = i % 3 === 0 ? 2 : 3;
    const number = `${letter}-${floor}${String(i + 1).padStart(2, "0")}`;
    const cover = [PHOTOS.livingRoom, PHOTOS.apartment, PHOTOS.interiorBright, PHOTOS.lounge, PHOTOS.flatBalcony][i % 5];
    return {
      id: `gen-m${i + 1}`,
      projectSlug: "meridian-residences",
      name: `Unit ${number}`,
      slug: `unit-${number.toLowerCase()}`,
      unitNumber: number,
      unitType: "Apartment",
      status: "available",
      floor,
      area: `${beds === 2 ? 1050 + i * 10 : 1380 + i * 15} sqft`,
      bedrooms: beds,
      bathrooms: beds,
      balconies: beds === 2 ? 1 : 2,
      parking: 1,
      facing: facings[i % facings.length],
      ...(i % 2 === 0 ? { price: `৳${beds === 2 ? 85 + i * 2 : 110 + i * 3} Lakh` } : {}),
      shortDescription: `A ${beds}-bedroom home on floor ${floor}.`,
      description: `A ${beds}-bedroom apartment on floor ${floor} of Meridian Residences, with cross ventilation and a private balcony.`,
      coverImage: img(cover, `Unit ${number} photo`),
      gallery: [img(cover, `Unit ${number} photo`)],
      floorPlan: { src: `/uploads/demo/${beds === 2 ? "plan-2bed" : "plan-3bed"}.svg`, alt: `Floor plan of Unit ${number}` },
    };
  });
  const harbor = Array.from({ length: 4 }, (_, i) => {
    const number = `${i < 2 ? "Retail" : "Office"} ${i + 1}`;
    return {
      id: `gen-h${i + 1}`,
      projectSlug: "harbor-view-commercial",
      name: i < 2 ? `Retail Unit G-0${i + 5}` : `Office Suite ${i + 2}A`,
      slug: i < 2 ? `retail-unit-g-0${i + 5}` : `office-suite-${i + 2}a`,
      unitType: "Commercial Unit",
      status: "available",
      floor: i < 2 ? 0 : i + 2,
      area: `${700 + i * 120} sqft`,
      shortDescription: `${number} in Harbor View Commercial.`,
      description: `Commercial space in Harbor View Commercial, Agrabad.`,
      coverImage: img(i < 2 ? PHOTOS.cityBlock : PHOTOS.glassOffice, "Commercial unit photo"),
      gallery: [img(i < 2 ? PHOTOS.cityBlock : PHOTOS.glassOffice, "Commercial unit photo")],
      floorPlan: { src: "/uploads/demo/plan-commercial.svg", alt: "Commercial unit floor plan" },
    };
  });
  const riverside = Array.from({ length: 6 }, (_, i) => ({
    id: `gen-r${i + 1}`,
    projectSlug: "riverside-plots",
    name: `Plot R-${20 + i}`,
    slug: `plot-r-${20 + i}`,
    unitType: "Plot",
    status: "available",
    area: `${3 + (i % 3)} Katha`,
    ...(i % 2 === 1 ? { price: `৳${38 + i * 3} Lakh` } : {}),
    shortDescription: "A planned residential plot with road access.",
    description: "A planned residential plot at Riverside Plots, Purbachal.",
    coverImage: img(PHOTOS.field, "Plot photo"),
    gallery: [img(PHOTOS.field, "Plot photo")],
    floorPlan: { src: "/uploads/demo/plan-plot.svg", alt: "Plot layout" },
  }));
  return [...meridian, ...harbor, ...riverside];
}

const portrait = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=75`;

// Obviously demo people — local database only.
const team = [
  { id: "tm1", group: "partner", name: "Nusrat Jahan", title: "Partner & Director of Sales", bio: "Leads customer relations from first visit to handover.", photo: portrait("1573496359142-b8d87734a5a2") },
  { id: "tm2", group: "partner", name: "Imran Chowdhury", title: "Development Partner", bio: "Works with landowners on joint-venture structures.", photo: portrait("1507003211169-0a1dd7228f2d") },
  { id: "tm3", group: "shareholder", name: "Farzana Karim", title: "Shareholder", bio: "Part of the company since its first development.", photo: portrait("1580489944761-15a19d654956") },
  { id: "tm4", group: "shareholder", name: "Tanvir Ahmed", title: "Shareholder & Advisor", photo: portrait("1560250097-0b93528c311a") },
  { id: "tm5", group: "employee", name: "Sadia Rahman", title: "Project Architect", bio: "Coordinates design and approvals across projects.", photo: portrait("1494790108377-be9c29b29330") },
  { id: "tm6", group: "employee", name: "Rafiq Hasan", title: "Site Engineer", photo: portrait("1472099645785-5658abf4ff4e") },
  { id: "tm7", group: "employee", name: "Mim Akter", title: "Customer Support" },
];

async function main() {
  for (const project of projects) {
    // Land (plots) has no building, so no building blueprints.
    const p = project.projectType === "Land" ? project : { ...project, blueprints: blueprints(project.name) };
    await prisma.projectContent.upsert({
      where: { id: p.id },
      create: { id: p.id, data: p },
      update: { data: p },
    });
  }

  for (const row of await prisma.unitContent.findMany()) {
    const imgs = unitImages[row.id];
    if (!imgs) continue;
    const data = row.data as Record<string, unknown>;
    await prisma.unitContent.update({
      where: { id: row.id },
      data: {
        data: {
          ...data,
          coverImage: img(imgs.cover, `${String(data.name)} photo`),
          gallery: imgs.gallery.map((id) => img(id, `${String(data.name)} photo`)),
          ...(floorPlans[row.id]
            ? { floorPlan: { src: `/uploads/demo/${floorPlans[row.id]}.svg`, alt: `Floor plan of ${String(data.name)}` } }
            : {}),
        },
      },
    });
  }

  for (const u of generatedUnits()) {
    await prisma.unitContent.upsert({ where: { id: u.id }, create: { id: u.id, data: u }, update: { data: u } });
  }

  for (const row of await prisma.galleryImage.findMany()) {
    const id = galleryImages[row.id];
    if (!id) continue;
    const data = row.data as { image?: { alt?: string } };
    await prisma.galleryImage.update({
      where: { id: row.id },
      data: { data: { ...data, image: img(id, data.image?.alt ?? "Gallery photo") } },
    });
  }

  for (const n of news) {
    await prisma.newsArticle.upsert({
      where: { id: n.id },
      create: { id: n.id, data: n },
      update: { data: n },
    });
  }

  for (const [i, m] of team.entries()) {
    const at = new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString();
    const data = { ...m, createdBy: "demo", createdAt: at, updatedAt: at };
    await prisma.teamMember.upsert({ where: { id: m.id }, create: { id: m.id, data }, update: { data } });
  }

  const founder = await prisma.founderProfile.findUnique({ where: { id: "founder" } });
  if (founder) {
    await prisma.founderProfile.update({
      where: { id: "founder" },
      data: {
        data: {
          ...(founder.data as Record<string, unknown>),
          name: "Anisur Rahman Sajal",
          intro: "Building homes people trust, one honest project at a time.",
          bio: "Every development begins with a piece of land and a promise.\n\nWhat started as a single apartment building grew into a company that plans, builds and delivers homes, and works with landowners as partners.\n\nThe approach has not changed: plan carefully, build to last, and say plainly what we can and cannot do.",
          statement: "A building is only as good as the promise behind it.",
          vision: "Developments that communities are proud to call home for generations.",
          mission: "To build with integrity and treat every landowner, buyer and partner fairly.",
          philosophy: "Slow down at the start so nothing has to be rushed at the end.",
          principles: ["Write every agreement so it can be understood.", "Choose durable over fast.", "One team sees a project through."],
          highlights: ["First development delivered", "Joint-venture partnerships with landowners", "In-house construction management"],
          photo: "/uploads/founder/founder-portrait.jpg",
          gallery: [
            { src: portrait("1486325212027-8081e485255e"), caption: "On site" },
            { src: portrait("1545324418-cc1a3fa10c00"), caption: "At the project" },
          ],
        },
      },
    });
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: "company" } });
  if (settings) {
    await prisma.companySettings.update({
      where: { id: "company" },
      data: {
        data: {
          ...(settings.data as Record<string, unknown>),
          // Obviously fake numbers — demo only, never the real company's.
          phone: "+880 1700-000000",
          whatsapp: "8801700000000",
          address: "House 12, Road 5, Gulshan 2, Dhaka",
          hours: "Sat–Thu, 10am–7pm",
          socialFacebook: "https://facebook.com",
          socialInstagram: "https://instagram.com",
          updatedAt: now,
        },
      },
    });
  }

  console.log("Demo content seeded into the local SQLite database.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
