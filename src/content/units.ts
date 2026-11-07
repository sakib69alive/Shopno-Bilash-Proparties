/**
 * Public unit/property data — one entry per sellable unit inside a project
 * (an apartment, a house, a commercial unit, …). Same lean-public-shape
 * philosophy as content/projects.ts. Linked to its project by `projectSlug`
 * (not a numeric id) since that's what the public route
 * `/projects/[slug]/units/[unitSlug]` actually needs to resolve.
 */
import type { ImageAsset } from "./shared";
import type { FlatOutline, PlanRooms } from "@/lib/planRooms";

export type UnitStatus = "available" | "reserved" | "sold" | "on-hold";

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  "on-hold": "On Hold",
};

/** Dot color per status — same restrained treatment as ProjectStatus, never a loud pill. */
export const UNIT_STATUS_TONE: Record<UnitStatus, string> = {
  available: "bg-success",
  reserved: "bg-accent",
  sold: "bg-fg-muted",
  "on-hold": "bg-fg-subtle",
};

export type UnitImage = ImageAsset;

export interface Unit {
  id: string;
  /** The project this unit belongs to — links via slug, matching the public routing model. */
  projectSlug: string;
  name: string;
  slug: string;
  /** Admin-chosen display position within its project (smaller = earlier). Unset = after the ordered ones. See `lib/sortOrder.ts`. */
  sortOrder?: number;
  unitNumber?: string;
  unitType: string;
  status: UnitStatus;
  floor?: number;
  area?: string;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  parking?: number;
  facing?: string;
  /** Formatted display string, e.g. "৳1.2 Crore" — kept as a string; only ever shown when actually set. */
  price?: string;
  shortDescription: string;
  description: string;
  coverImage: UnitImage;
  gallery: UnitImage[];
  floorPlan?: UnitImage;
  /** Rooms marked on the floor plan — buttons that lift a room off the plan on the public unit page. */
  floorPlanRooms?: PlanRooms;
  /** When the uploaded floor plan is a WHOLE-FLOOR drawing: where this flat sits on it, so the unit page shows only this flat. */
  floorPlanFlat?: FlatOutline;
  /** URL to a real downloadable floor-plan file, if one exists — never fabricated. */
  floorPlanFile?: string;
  /** A YouTube / Vimeo / Facebook / .mp4 link. When empty, no video option shows anywhere on the public site. */
  videoUrl?: string;
  /** A 360° virtual-tour page link (Matterport, Kuula, …). When empty, no 360° option shows anywhere on the public site. */
  tour360Url?: string;
  features?: string[];
}

/**
 * ⚠ DEMO DATA — see the matching note in content/projects.ts. Placeholder
 * units for visual QA only, not real listings.
 */
const placeholderImage: UnitImage = {
  src: "/placeholder-image.png",
  alt: "Placeholder interior image",
};

export const units: Unit[] = [
  {
    id: "u1",
    projectSlug: "meridian-residences",
    name: "Unit A-502",
    slug: "unit-a-502",
    unitNumber: "A-502",
    unitType: "Apartment",
    status: "available",
    floor: 5,
    area: "1,450 sqft",
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    parking: 1,
    facing: "South-East",
    price: "৳1.2 Crore",
    shortDescription: "A 3-bedroom corner unit on the 5th floor with dual balconies.",
    description:
      "Unit A-502 sits at the corner of the building, giving it windows on two sides and cross-ventilation through the living area. The layout separates the bedrooms from the living/dining space for privacy.",
    coverImage: placeholderImage,
    gallery: [placeholderImage, placeholderImage, placeholderImage, placeholderImage],
    floorPlan: { src: "/placeholder-floorplan.png", alt: "Floor plan for Unit A-502" },
    features: ["Open Kitchen Layout", "Floor-to-Ceiling Windows", "Private Balcony", "Master Suite"],
  },
  {
    id: "u2",
    projectSlug: "meridian-residences",
    name: "Unit B-210",
    slug: "unit-b-210",
    unitNumber: "B-210",
    unitType: "Apartment",
    status: "reserved",
    floor: 2,
    area: "1,050 sqft",
    bedrooms: 2,
    bathrooms: 2,
    shortDescription: "A 2-bedroom unit on the 2nd floor, currently reserved.",
    description: "Unit B-210 is a compact 2-bedroom layout facing the building's internal courtyard.",
    coverImage: placeholderImage,
    gallery: [placeholderImage],
  },
  {
    id: "u3",
    projectSlug: "meridian-residences",
    name: "Unit C-118 (Duplex)",
    slug: "unit-c-118",
    unitNumber: "C-118",
    unitType: "Duplex",
    status: "sold",
    floor: 1,
    bedrooms: 4,
    shortDescription: "A 4-bedroom ground-floor duplex — sold.",
    description: "Unit C-118 was a duplex unit spanning the ground and first floors, sold prior to completion.",
    coverImage: placeholderImage,
    gallery: [],
  },
  {
    id: "u4",
    projectSlug: "harbor-view-commercial",
    name: "Retail Unit G-04",
    slug: "retail-unit-g-04",
    unitNumber: "G-04",
    unitType: "Commercial Unit",
    status: "available",
    floor: 0,
    area: "820 sqft",
    parking: 1,
    shortDescription: "Ground-floor retail space fronting Agrabad's main commercial road.",
    description:
      "Retail Unit G-04 sits at street level with direct frontage onto Agrabad's main road, suited for a showroom or branch office.",
    coverImage: placeholderImage,
    gallery: [placeholderImage, placeholderImage],
    features: ["Street Frontage", "Loading Access", "Dedicated Parking"],
  },
  {
    id: "u5",
    projectSlug: "harbor-view-commercial",
    name: "Office Suite 4B",
    slug: "office-suite-4b",
    unitNumber: "4B",
    unitType: "Commercial Unit",
    status: "reserved",
    floor: 4,
    area: "1,100 sqft",
    parking: 1,
    shortDescription: "A full-floor office suite on the 4th floor, currently reserved.",
    description: "Office Suite 4B occupies a full bay on the fourth floor, with an open-plan layout ready to fit out.",
    coverImage: placeholderImage,
    gallery: [placeholderImage],
  },
  {
    id: "u6",
    projectSlug: "the-grove",
    name: "Unit D-3",
    slug: "unit-d-3",
    unitNumber: "D-3",
    unitType: "Apartment",
    status: "sold",
    floor: 3,
    area: "1,320 sqft",
    bedrooms: 3,
    bathrooms: 2,
    shortDescription: "A 3-bedroom apartment in the completed Grove development — sold.",
    description:
      "Unit D-3 was one of 36 apartments delivered as part of The Grove in 2023, sold prior to handover.",
    coverImage: placeholderImage,
    gallery: [placeholderImage],
  },
  {
    id: "u7",
    projectSlug: "riverside-plots",
    name: "Plot R-12",
    slug: "plot-r-12",
    unitNumber: "R-12",
    unitType: "Plot",
    status: "available",
    area: "5 Katha",
    facing: "East",
    price: "৳45 Lakh",
    shortDescription: "A 5-katha corner plot along the riverside corridor.",
    description:
      "Plot R-12 is a corner plot within the Riverside Plots development, with road access on two sides once site works are complete.",
    coverImage: placeholderImage,
    gallery: [placeholderImage],
  },
  {
    id: "u8",
    projectSlug: "riverside-plots",
    name: "Plot R-18",
    slug: "plot-r-18",
    unitNumber: "R-18",
    unitType: "Plot",
    status: "available",
    area: "3 Katha",
    facing: "South",
    shortDescription: "A 3-katha plot suited for a single-family home.",
    description:
      "Plot R-18 sits mid-block within the Riverside Plots development, close to the planned community green space.",
    coverImage: placeholderImage,
    gallery: [placeholderImage],
  },
];
