/**
 * Public project data — a lean, display-oriented shape (not the heavy
 * internal `Project` type in src/types/project.ts, which carries admin-only
 * fields like budget/landownerId). This is what the future Admin Panel
 * would publish from the internal model onto the public site.
 */
import type { ImageAsset } from "./shared";
import type { PlanRooms } from "@/lib/planRooms";

export type ProjectStatus =
  | "upcoming"
  | "planning"
  | "ongoing"
  | "near-completion"
  | "completed"
  | "handed-over"
  | "sold-out";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  upcoming: "Upcoming",
  planning: "In Planning",
  ongoing: "Ongoing",
  "near-completion": "Near Completion",
  completed: "Completed",
  "handed-over": "Handed Over",
  "sold-out": "Sold Out",
};

/** Dot color per status — deliberately just a tiny dot + label, never a colorful pill (brief §5). */
export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  upcoming: "bg-fg-subtle",
  planning: "bg-fg-subtle",
  ongoing: "bg-accent",
  "near-completion": "bg-accent",
  completed: "bg-success",
  "handed-over": "bg-success",
  "sold-out": "bg-fg-muted",
};

export type ProjectImage = ImageAsset;

/** Which part of the building a blueprint shows — also the order they are swiped in: garage, then floor, then roof. */
export type BlueprintKind = "garage" | "floor" | "roof";

export const BLUEPRINT_KIND_ORDER: BlueprintKind[] = ["garage", "floor", "roof"];

export const BLUEPRINT_KIND_LABEL: Record<BlueprintKind, string> = {
  garage: "Garage",
  floor: "Floor",
  roof: "Roof",
};

export interface ProjectBlueprint {
  kind: BlueprintKind;
  /** Shown on the tab and caption — defaults to the kind's label, but a floor plan is often "Typical floor (2–9)". */
  label: string;
  image: ProjectImage;
  /** Rooms marked on this plan (by hand in Admin, or read from `data-room` markers in the SVG) — they become buttons that lift a room off the plan. */
  planRooms?: PlanRooms;
  /** Hidden from the public project page without deleting it (Admin → Settings → Blueprint AI → Control panel). */
  hidden?: boolean;
}

export interface NearbyPlace {
  label: string;
  /** Only set when a real, verified distance/time is known — never estimated. */
  distance?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  /** Specific display location, e.g. "Gulshan 2, Dhaka". */
  location: string;
  /** City only, e.g. "Dhaka" — the filterable/groupable geography field. */
  city: string;
  projectType: string;
  status: ProjectStatus;
  shortDescription: string;
  description: string;
  /** Architectural idea / design philosophy statement — the Design Story section's lead line. */
  concept?: string;
  coverImage: ProjectImage;
  gallery: ProjectImage[];
  /** Building blueprints uploaded from Admin → Website → Projects. Each kind is optional; shown garage → floor → roof. */
  blueprints?: ProjectBlueprint[];
  /** Hide the whole "Building blueprints" section on this project's public page (the plans stay saved). */
  blueprintsHidden?: boolean;
  /** Hide the "Enlarge" / full-screen button on this project's public blueprints. */
  blueprintZoomHidden?: boolean;
  /** A YouTube / Vimeo / Facebook / .mp4 link. When empty, no video option shows anywhere on the public site. */
  videoUrl?: string;
  /** A 360° virtual-tour page link (Matterport, Kuula, …). When empty, no 360° option shows anywhere on the public site. */
  tour360Url?: string;
  completionYear?: number;
  totalUnits?: number;
  availableUnits?: number;
  /** e.g. ["2 Bed", "3 Bed", "Duplex"] — for the availability preview only, not a full unit explorer (Step 10). */
  unitTypes?: string[];
  totalParkingCar?: number;
  availableParkingCar?: number;
  totalParkingBike?: number;
  availableParkingBike?: number;
  area?: string;
  floors?: number;
  buildingType?: string;
  /** Short feature/amenity labels, e.g. "Rooftop Garden", "Underground Parking". */
  features?: string[];
  locationDescription?: string;
  /** Pasted Google Maps link / embed src / "lat, lng" — parsed by `lib/mapLinks.ts`. Empty = placeholder box. */
  mapUrl?: string;
  nearbyPlaces?: NearbyPlace[];
  featured: boolean;
  /** Admin-chosen display position (smaller = earlier). Unset = after the ordered ones. See `lib/sortOrder.ts`. */
  sortOrder?: number;
}

/** Not populated yet — real projects are created by admin via the Website CMS (`/admin/content/projects`), not static data here. */
export const projects: Project[] = [];
