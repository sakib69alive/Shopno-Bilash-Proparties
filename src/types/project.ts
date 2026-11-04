import type { AuditFields, ID, Money } from "./common";

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
