import type { AuditFields, ID, Money } from "./common";

export type UnitStatus =
  | "available"
  | "reserved"
  | "booked"
  | "under-agreement"
  | "sold"
  | "transferred"
  | "allocated"
  | "on-hold"
  | "unavailable"
  | "under-construction"
  | "cancelled";

export type UnitFacing = "north" | "south" | "east" | "west" | "north-east" | "north-west" | "south-east" | "south-west";

export interface Unit extends AuditFields {
  id: ID;
  projectId: ID;
  buildingId: ID;
  floorId: ID;
  unitNumber: string;

  sizeSqft: number;
  /** Admin-set override for the "unit-ratio" cost-allocation method. Unset = derive a suggested ratio from this unit's sqft proportion at read/preview time — never silently written back here as a default. */
  allocationRatio?: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  parkingSpaces: number;
  facing?: UnitFacing;
  /** A custom blueprint for this one flat — wins over its type's shared plan. */
  layoutImage?: string;
  /** Explicit choice of a project `UnitType`; when unset the type is matched automatically from the flat number. */
  unitTypeId?: ID;
  /** This unit's own gallery — a design/finish can differ unit to unit, not just building to building. */
  galleryImages?: string[];

  basePrice: Money;
  additionalCharges: Money;
  discount: Money;
  /** Derived (basePrice + additionalCharges - discount) — computed at read time, never stored redundantly. */
  finalPrice: Money;

  status: UnitStatus;

  /** The Admin has switched these off for the owner of this flat (Clients page → their panel): nothing of it reaches the owner's portal. */
  hidePlanFromOwner?: boolean;
  /** Blueprint distribution: the admin chose this specific whole-floor plan (`BuildingFloorPlan.id`) for this flat's owner, instead of the one picked automatically by floor. */
  planFloorPlanId?: ID;
  hideConstructionFromOwner?: boolean;

  // Ownership/allocation — at most one of these is set at a time.
  customerId?: ID;
  shareholderId?: ID;
  landownerAllocationId?: ID;
}
