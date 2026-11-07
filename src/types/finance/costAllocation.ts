import type { AuditFields, ID, Money } from "../common";

export type FineType = "flat" | "percentage";
export type CostAllocationStatus = "draft" | "generated" | "cancelled";

/**
 * How a CostAllocation's target amount is split across owners.
 * "sqft" is the original, only method this system had — kept as the
 * default for every allocation created before this field existed (absent
 * on an old row means "sqft", see `resolveAllocationMethod`). A "hybrid"
 * goal (base cost by ratio + separate additional charges) is modeled as
 * two separate CostAllocation rows, not a fifth method here — a compound
 * formula would itself be "forcing everything into one formula," the
 * exact thing this field exists to avoid.
 */
export type AllocationMethod = "sqft" | "unit-ratio" | "fixed-unit" | "custom" | "tier";

/**
 * A shared construction cost (e.g. "Piling — Phase 1") to be split across
 * every unit owner in a project, by unit size — the unit-based-ownership
 * cost-sharing engine. Kept as its own finance sub-domain, separate from
 * `ProjectExpense` (a plain company cost record) — an allocation is a
 * *billing-back* of a cost to owners, not the cost itself; `linkedExpenseId`
 * is the optional bridge between the two for traceability.
 */
export interface CostAllocation extends AuditFields {
  id: ID;
  projectId: ID;
  title: string;
  category: string;
  totalAmount: Money;
  /** Set when the Admin chose "keep everyone else's amount, add the extra on top": the budget as first planned. `totalAmount` then holds the new, higher (or lower) total. */
  originalAmount?: Money;
  allocationDate: string;
  dueDate: string;
  fineType: FineType;
  /** A taka amount when fineType is "flat", or a percentage (e.g. 5 = 5%) when "percentage". */
  fineValue: number;
  /** Optional link to the real ProjectExpense this allocation is billing back — not required. */
  linkedExpenseId?: ID;
  status: CostAllocationStatus;
  /**
   * Snapshot of total sqft actually billed, set once contributions are
   * generated — excludes unsold/unowned units at that moment. Kept so the
   * ratio basis stays auditable even if unit ownership changes afterward.
   */
  totalAllocatedSqft?: number;
  /** Absent = "sqft" (see AllocationMethod's own doc comment). */
  allocationMethod?: AllocationMethod;
  /** Only meaningful for "fixed-unit"/"custom" methods — parking has no sqft basis to ratio against. */
  includeParkingInAllocation?: boolean;
  /** Set via `markCostAllocationCompleted` — an explicit Admin action, never implied just by reaching 100% collection. */
  completedAt?: string;
  /** Set via `archiveCostAllocation` — an explicit Admin action, independent of collection state. */
  archivedAt?: string;
}

export type OwnerType = "customer" | "shareholder" | "landowner";

/** One owner's payable line, generated from a CostAllocation by unit-size ratio. */
export interface OwnerContribution extends AuditFields {
  id: ID;
  costAllocationId: ID;
  projectId: ID;
  ownerType: OwnerType;
  /** customerId / shareholderId / landownerId, depending on ownerType. */
  ownerId: ID;
  /** This owner's units in this project, snapshotted at generation time. */
  unitIds: ID[];
  unitSizeSqft: number;
  /** unitSizeSqft / CostAllocation.totalAllocatedSqft, snapshotted at generation time. */
  shareRatio: number;
  payableAmount: Money;
  /** What this owner would have paid at the normal share, before a custom amount — only set when the budget was raised "on top". `payableAmount − baseAmount` is the extra. */
  baseAmount?: Money;
  /** Denormalized running total, recomputed from this contribution's ContributionPayment rows on every payment write — never hand-edited. */
  paidAmount: Money;
  /** Copied from the CostAllocation at generation time. */
  dueDate: string;
}

export type ContributionPaymentMethod = "cash" | "bank-transfer" | "cheque" | "mobile-banking" | "card";

/** A payment recorded against one OwnerContribution. */
export interface ContributionPayment extends AuditFields {
  id: ID;
  contributionId: ID;
  amount: Money;
  date: string;
  method: ContributionPaymentMethod;
  reference?: string;
  receiptNumber?: string;
  /** Which installment this payment applies to — undefined means a general lump payment against the whole contribution (every payment recorded before this field existed means this). One payment always maps to at most one installment; no automatic multi-installment splitting. */
  installmentObligationId?: ID;
}

/**
 * Immutable per-unit read-model row, written once per unit alongside each
 * OwnerContribution at generation time — never itself accepts payments.
 * The brief only asks that unit-level breakdown be *visible* alongside the
 * owner-level total (e.g. "Unit 1A → ৳60,000, Unit 4C → ৳80,000, owner
 * total → ৳140,000"), not that a unit be independently payable; payments
 * stay exactly where they already worked before this — at the owner level.
 */
export interface UnitAllocation extends AuditFields {
  id: ID;
  costAllocationId: ID;
  contributionId: ID;
  projectId: ID;
  unitId: ID;
  ownerType: OwnerType;
  ownerId: ID;
  /** Snapshot at generation time. */
  sizeSqft: number;
  /** This unit's share of its owner's total (sums to 1.0 across one owner's units in this allocation). */
  ratio: number;
  payableAmount: Money;
}

export type InstallmentAmountMode = "percentage" | "fixed";

/**
 * A goal's own installment schedule — distinct from `types/sales.ts`'s
 * `Installment` (a unit's SALE-PRICE payment plan via `Contract`, a wholly
 * different business relationship). Not reused or merged with that type on
 * purpose; see `src/features/costAllocations/installmentActions.ts`'s own
 * doc comment for the full reasoning.
 */
export interface GoalInstallment extends AuditFields {
  id: ID;
  costAllocationId: ID;
  projectId: ID;
  installmentNumber: number;
  label: string;
  amountMode: InstallmentAmountMode;
  /** A percentage (0-100) of each owner's payableAmount, or a flat taka figure — meaning depends on amountMode. */
  amountValue: number;
  dueDate: string;
  notes?: string;
}

/** One owner's obligation for one GoalInstallment — computed once at plan-creation time, immutable like OwnerContribution/UnitAllocation. */
export interface OwnerInstallmentObligation extends AuditFields {
  id: ID;
  goalInstallmentId: ID;
  contributionId: ID;
  projectId: ID;
  ownerType: OwnerType;
  ownerId: ID;
  payableAmount: Money;
}

export type AdjustmentType = "discount" | "waiver" | "additional-charge" | "correction" | "refund";

/**
 * A signed, non-destructive correction to a contribution's effective
 * payable — never mutates `OwnerContribution.payableAmount` itself.
 * Positive amount = increases what's owed (additional-charge/a positive
 * correction); negative = decreases it (discount/waiver/refund/a negative
 * correction). No approval workflow — a flat record with a reason,
 * matching the brief's explicit "don't over-build a full accounting
 * system" instruction.
 */
export interface ContributionAdjustment extends AuditFields {
  id: ID;
  contributionId: ID;
  projectId: ID;
  type: AdjustmentType;
  amount: Money;
  reason: string;
}

export type TierAdjustmentMode = "percentage" | "fixed";

/**
 * A named, admin-defined group of units within one "tier" CostAllocation
 * (e.g. "Tier A" = every top-floor corner unit) — the equal-split-per-unit
 * baseline (`totalAmount / ownedUnitCount`) is the starting point for every
 * unit; a tier's `adjustmentValue` then shifts its member units' share
 * relative to that baseline, either by percentage or by a flat taka delta.
 * Every unit belongs to at most one tier; units in no tier stay at the
 * baseline. See `src/features/costAllocations/tierAllocation.ts` for the
 * rebalancing math that keeps the grand total fixed at `totalAmount`
 * regardless of how tiers are adjusted.
 */
export interface UnitTier extends AuditFields {
  id: ID;
  costAllocationId: ID;
  projectId: ID;
  name: string;
  unitIds: ID[];
  adjustmentMode: TierAdjustmentMode;
  /** 0 = no adjustment (tier behaves exactly like the baseline). A percentage (e.g. 10 = +10%) or a flat BDT delta per unit, depending on adjustmentMode. Negative values are valid (a tier can get less than baseline). */
  adjustmentValue: number;
}
