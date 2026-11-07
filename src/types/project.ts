import type { AuditFields, ID, Money } from "./common";
import type { PlanRoom, PlanView } from "@/lib/planRooms";

export type ProjectStatus =
  | "upcoming"
  | "planning"
  | "ongoing"
  | "ready"
  | "completed"
  | "suspended"
  | "cancelled";

export interface ProjectMedia {
  coverImage?: string;
  gallery: string[];
  renders: string[];
  videos: string[];
}

/**
 * One floor-plan design shared by many flats of a project (e.g. "Type A" —
 * the A flat on every floor). `positionCode` is the part of a flat's number
 * that stays the same from floor to floor ("A" for 1A, 2A, 3A…), so every flat
 * with that code picks the type's blueprint up automatically — see
 * `lib/unitPlan.ts`. Changing a type's image updates all of its flats.
 */
export interface UnitType {
  id: ID;
  name: string;
  positionCode?: string;
  image?: string;
}

/** One flat's footprint on a whole-floor plan: a closed polygon, every point as a 0–1 fraction of the plan's width/height (so it survives any screen size). */
export interface FlatArea {
  /** "flat" (default) or "parking" — a parking bay marked on the ground / parking-level plan, keyed by the space's number (P-01). */
  kind?: "flat" | "parking";
  /** The flat's position code on the floor — "A" for 1A, 2A, 3A… (same idea as `UnitType.positionCode`). */
  key: string;
  points: [number, number][];
  /** Degrees (clockwise) this flat is turned on the client's Home card — for a flat drawn at a different angle from the rest of the floor. */
  turn?: number;
}

/**
 * A whole-floor plan of the building, drawn once and shared by many floors — the architect's "typical floor". An owner opening
 * their flat sees this plan with their own flat's `areas` entry lit and the other flats dimmed. `floors` lists the floor numbers
 * (ground = 0) that use this plan; an EMPTY list means "every floor no other plan claims", so a building with one typical plan
 * and a different ground floor or penthouse needs only the exceptions listed. Resolved at read time — see `lib/unitPlan.ts`.
 */
export interface BuildingFloorPlan {
  id: ID;
  name: string;
  image: string;
  /** width ÷ height of the drawing (from its viewBox), so the highlight can be laid exactly over it. */
  aspect: number;
  floors: number[];
  areas: FlatArea[];
  /** Rooms marked on the drawing (by hand or from `data-room` markers): the client app shows the ones inside the owner's own flat as buttons. */
  rooms?: PlanRoom[];
  /** The admin's own placement (tilt / zoom / shift) of this plan on the client app. */
  view?: PlanView;
  /** Zoom / shift of one flat on the client's Home card (the flat cut out of this plan), set from Blueprint AI → Distribution. */
  homeView?: PlanView;
}

export interface Project extends AuditFields {
  id: ID;
  code: string;
  name: string;
  slug: string;
  description: string;

  // Location
  address: string;
  area?: string;
  city: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;

  // Land
  landAreaSqft?: number;
  plotInfo?: string;
  ownershipStructure?: string;
  landownerId?: ID;

  // Building
  propertyType: string;
  buildingCount: number;
  floorCount: number;
  unitCount: number;
  parkingCount?: number;
  amenities: string[];

  // Timeline
  launchDate?: string;
  constructionStartDate?: string;
  expectedCompletionDate?: string;
  handoverDate?: string;

  status: ProjectStatus;

  // Commercial (internal — see DataVisibility on Budget/actual-cost fields in finance types)
  salesStatus: "not-started" | "open" | "closed";
  budget?: Money;

  media: ProjectMedia;

  /** Whether this project is visible on the public website yet. */
  isPublished: boolean;

  /** Blueprint designs shared across this project's flats. A flat can still override with its own custom plan (`Unit.layoutImage`). */
  unitTypes?: UnitType[];

  /** Whole-floor plans of the building (typical floor + exceptions), with each flat's area marked — shown to owners with their own flat highlighted. */
  floorPlans?: BuildingFloorPlan[];
}

export type BuildingStatus = "planning" | "under-construction" | "completed";

export interface Building extends AuditFields {
  id: ID;
  projectId: ID;
  name: string;
  code?: string;
  status: BuildingStatus;
  /** Summary/convenience count — never enforced against real `Floor` rows, so an irregular building stays freely editable. */
  floorCount: number;
  coverImage?: string;
  gallery: string[];
  notes?: string;
}

export interface Floor extends AuditFields {
  id: ID;
  /** Denormalized from the building for project-scoping, matching every other domain's convention. */
  projectId: ID;
  buildingId: ID;
  label: string;
  floorNumber: number;
  /** Summary/convenience count — never enforced against real `Unit` rows. */
  unitCount: number;
  notes?: string;
}
