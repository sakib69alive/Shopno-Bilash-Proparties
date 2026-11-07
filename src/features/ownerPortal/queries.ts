import "server-only";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository, landownerAllocationRepository } from "@/features/landowners/repository";
import { unitRepository } from "@/features/units/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { parkingRepository } from "@/features/parking/repository";
import { projectRepository } from "@/features/projects/repository";
import { customerPaymentRepository } from "@/features/finance/repository";
import {
  costAllocationRepository,
  ownerContributionRepository,
  contributionAdjustmentRepository,
  contributionPaymentRepository,
  ownerInstallmentObligationRepository,
  goalInstallmentRepository,
  unitAllocationRepository,
} from "@/features/costAllocations/repository";
import { documentRepository } from "@/features/documents/repository";
import { notificationRepository } from "@/features/notifications/repository";
import { userRepository } from "@/features/users/repository";
import { saleRepository, bookingRepository, installmentRepository } from "@/features/sales/repository";
import {
  constructionPhaseRepository,
  constructionTaskRepository,
  milestoneRepository,
  scheduleRevisionRepository,
  constructionActivityLogRepository,
} from "@/features/construction/repository";
import { getCurrentOwnershipRecord } from "@/features/ownership/queries";
import { getProjectWorkspaceStats } from "@/features/projects/workspaceStats";
import { computeContributionState, computeInstallmentObligationState } from "@/lib/contributionStatus";
import { derivePhaseProgress, computeOverallProgress, deriveScheduleDelay } from "@/lib/constructionProgress";
import { isOwnerVisible } from "@/lib/documentVisibility";
import { summarizeSale } from "@/lib/salePayments";
import { allocateInstallments, type LiveInstallmentStatus } from "@/lib/installmentStatus";
import type { OwnerType } from "@/types/finance/costAllocation";
import type { OwnershipRecord } from "@/types/ownership";
import type { Sale, Booking } from "@/types/sales";
import type { ConstructionStatus } from "@/types/construction";
import type { ID } from "@/types/common";

/**
 * Prompt 10 — "prepare, don't build" for Chapter 3's Owner/Customer Portal.
 * Every function here is a read-only query over data that already exists
 * (the Admin Panel stays the one source of truth, nothing is duplicated
 * for the future portal's sake) — these are the exact GET-shaped
 * operations the brief lists, not a full API layer, and not wired to any
 * route yet. Each one resolves the owner's *current* units/parking via
 * the same fast-path fields (`Unit.customerId`/`shareholderId`/
 * `landownerAllocationId`, `Parking.ownerType`/`ownerId`) every other
 * ownership query in this app already reads.
 */

export interface OwnerProfile {
  ownerType: OwnerType;
  ownerId: ID;
  name: string;
  phone?: string;
  email?: string;
}

export async function getOwnerProfile(ownerType: OwnerType, ownerId: ID): Promise<OwnerProfile | null> {
  if (ownerType === "customer") {
    const c = await customerRepository.findById(ownerId);
    return c ? { ownerType, ownerId, name: c.name, phone: c.phone, email: c.email } : null;
  }
  if (ownerType === "shareholder") {
    const s = await shareholderRepository.findById(ownerId);
    return s ? { ownerType, ownerId, name: s.name, phone: s.phone } : null;
  }
  const l = await landownerRepository.findById(ownerId);
  return l ? { ownerType, ownerId, name: l.name, phone: l.phone } : null;
}

async function getOwnerUnitIds(ownerType: OwnerType, ownerId: ID): Promise<Set<ID>> {
  const units = await unitRepository.list();
  if (ownerType === "customer") return new Set(units.filter((u) => u.customerId === ownerId).map((u) => u.id));
  if (ownerType === "shareholder") return new Set(units.filter((u) => u.shareholderId === ownerId).map((u) => u.id));
  const allocations = await landownerAllocationRepository.list();
  const allocationIds = new Set(allocations.filter((a) => a.landownerId === ownerId).map((a) => a.id));
  return new Set(units.filter((u) => u.landownerAllocationId && allocationIds.has(u.landownerAllocationId)).map((u) => u.id));
}

export async function getOwnerUnits(ownerType: OwnerType, ownerId: ID) {
  const [units, unitIds] = await Promise.all([unitRepository.list(), getOwnerUnitIds(ownerType, ownerId)]);
  return units.filter((u) => unitIds.has(u.id));
}

export async function getOwnerProjects(ownerType: OwnerType, ownerId: ID) {
  const [units, projects] = await Promise.all([getOwnerUnits(ownerType, ownerId), projectRepository.list()]);
  const projectIds = new Set(units.map((u) => u.projectId));
  return projects.filter((p) => projectIds.has(p.id));
}

export async function getOwnerParking(ownerType: OwnerType, ownerId: ID) {
  const parking = await parkingRepository.list();
  return parking.filter((p) => p.ownerType === ownerType && p.ownerId === ownerId);
}

export interface OwnerUnitDetail {
  unit: Awaited<ReturnType<typeof getOwnerUnits>>[number];
  project: Awaited<ReturnType<typeof projectRepository.list>>[number] | null;
  building: Awaited<ReturnType<typeof buildingRepository.list>>[number] | null;
  floor: Awaited<ReturnType<typeof floorRepository.list>>[number] | null;
  parking: Awaited<ReturnType<typeof getOwnerParking>>;
  /** Current (open) ownership span for this unit — undefined would mean a data gap, since an owned unit should always have one. */
  ownershipRecord: OwnershipRecord | null;
  /** Only ever set for `ownerType === "customer"` — shareholders/landowners never go through a Booking/Sale. */
  booking: Booking | null;
  sale: Sale | null;
}

/**
 * Data isolation lives here, not just in the UI: the unit is only returned
 * if it's among `getOwnerUnitIds` for this exact owner, so a guessed/typed
 * unit id belonging to someone else resolves to `null` rather than leaking
 * another owner's flat.
 */
export async function getOwnerUnitDetail(ownerType: OwnerType, ownerId: ID, unitId: ID): Promise<OwnerUnitDetail | null> {
  const unitIds = await getOwnerUnitIds(ownerType, ownerId);
  if (!unitIds.has(unitId)) return null;

  const [units, projects, buildings, floors, parking, ownershipRecord, bookings, sales] = await Promise.all([
    unitRepository.list(),
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    getOwnerParking(ownerType, ownerId),
    getCurrentOwnershipRecord("unit", unitId),
    ownerType === "customer" ? bookingRepository.list() : Promise.resolve([]),
    ownerType === "customer" ? saleRepository.list() : Promise.resolve([]),
  ]);
  const unit = units.find((u) => u.id === unitId);
  if (!unit) return null;

  const ownBookings = bookings.filter((b) => b.unitId === unitId && b.customerId === ownerId);
  const ownSales = sales
    .filter((s) => s.unitId === unitId && s.customerId === ownerId)
    .sort((a, b) => b.saleDate.localeCompare(a.saleDate));

  return {
    unit,
    project: projects.find((p) => p.id === unit.projectId) ?? null,
    building: buildings.find((b) => b.id === unit.buildingId) ?? null,
    floor: floors.find((f) => f.id === unit.floorId) ?? null,
    parking: parking.filter((p) => p.projectId === unit.projectId),
    ownershipRecord: ownershipRecord ?? null,
    booking: ownBookings.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))[0] ?? null,
    sale: ownSales[0] ?? null,
  };
}

/** Real payments only — `CustomerPayment` (customer-side sale/installment payments) and `ContributionPayment` (construction-goal contributions, all owner types) are two genuinely separate transaction sources, never merged into one generic list. */
export async function getOwnerPayments(ownerType: OwnerType, ownerId: ID) {
  const [contributions, contributionPayments, customerPayments] = await Promise.all([
    ownerContributionRepository.list(),
    contributionPaymentRepository.list(),
    ownerType === "customer" ? customerPaymentRepository.list() : Promise.resolve([]),
  ]);
  const ownContributionIds = new Set(contributions.filter((c) => c.ownerType === ownerType && c.ownerId === ownerId).map((c) => c.id));
  return {
    contributionPayments: contributionPayments.filter((p) => ownContributionIds.has(p.contributionId)),
    customerPayments: ownerType === "customer" ? customerPayments.filter((p) => p.customerId === ownerId) : [],
  };
}

/** A cancelled goal bills no one anything — obligations under it are excluded everywhere an owner would otherwise see them as still owed, matching how the admin's own `deriveGoalCollectionStatus` treats "cancelled" as a terminal, non-billable state. */
function isBillableAllocation(allocation: { status: string } | undefined): boolean {
  return !!allocation && allocation.status !== "cancelled";
}

export async function getOwnerInstallments(ownerType: OwnerType, ownerId: ID, projectId?: ID) {
  const [obligations, installments, allocations, contributions] = await Promise.all([
    ownerInstallmentObligationRepository.list(),
    goalInstallmentRepository.list(),
    costAllocationRepository.list(),
    ownerContributionRepository.list(),
  ]);
  const allocationsById = new Map(allocations.map((a) => [a.id, a]));
  const ownContributionIds = new Set(
    contributions
      .filter((c) => c.ownerType === ownerType && c.ownerId === ownerId)
      .filter((c) => !projectId || allocationsById.get(c.costAllocationId)?.projectId === projectId)
      .filter((c) => isBillableAllocation(allocationsById.get(c.costAllocationId)))
      .map((c) => c.id),
  );
  const own = obligations.filter((o) => ownContributionIds.has(o.contributionId));
  const installmentsById = new Map(installments.map((i) => [i.id, i]));
  return own.map((o) => ({ obligation: o, installment: installmentsById.get(o.goalInstallmentId) }));
}

export interface OwnerOutstandingSummary {
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

/** `projectId` narrows to just that project's cost allocations — used by the "My Property" preview for a multi-property owner, so the figures shown match the property currently in view. Omitted, it aggregates across every project (the dashboard/full Payments page's behavior). */
export async function getOwnerOutstanding(ownerType: OwnerType, ownerId: ID, projectId?: ID): Promise<OwnerOutstandingSummary> {
  const [allocations, contributions, adjustments] = await Promise.all([
    costAllocationRepository.list(),
    ownerContributionRepository.list(),
    contributionAdjustmentRepository.list(),
  ]);
  const allocationsById = new Map(allocations.map((a) => [a.id, a]));
  const own = contributions.filter((c) => {
    if (c.ownerType !== ownerType || c.ownerId !== ownerId) return false;
    if (!isBillableAllocation(allocationsById.get(c.costAllocationId))) return false;
    if (!projectId) return true;
    return allocationsById.get(c.costAllocationId)?.projectId === projectId;
  });

  let totalPayable = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  for (const contribution of own) {
    const allocation = allocationsById.get(contribution.costAllocationId);
    if (!allocation) continue;
    const ownAdjustments = adjustments.filter((a) => a.contributionId === contribution.id);
    const state = computeContributionState(contribution, allocation, ownAdjustments);
    totalPayable += state.effectivePayable;
    totalPaid += contribution.paidAmount.amount;
    totalOutstanding += state.outstanding;
    if (state.status === "overdue") overdueCount += 1;
  }
  return { totalPayable, totalPaid, totalOutstanding, overdueCount };
}

export interface OwnerUnitShare {
  unitId: ID;
  /** This unit's slice of the project's total construction contribution — read-only, never itself payable (see `UnitAllocation`'s own doc comment: payments stay at the owner level). */
  payableAmount: number;
}

/**
 * A `CostAllocation`/`OwnerContribution` is generated per owner *per
 * project*, not per unit — an owner with two units in the same project
 * pays one combined contribution, not two independent ones. This surfaces
 * the real, admin-generated `UnitAllocation` breakdown so a multi-unit
 * owner viewing one property's finances can see their own honest slice of
 * the shared total instead of a fabricated per-unit split.
 */
export async function getOwnerUnitShares(ownerType: OwnerType, ownerId: ID, projectId: ID): Promise<OwnerUnitShare[]> {
  const allocations = await unitAllocationRepository.list();
  const own = allocations.filter((a) => a.ownerType === ownerType && a.ownerId === ownerId && a.projectId === projectId);

  const byUnit = new Map<ID, number>();
  for (const a of own) {
    byUnit.set(a.unitId, (byUnit.get(a.unitId) ?? 0) + a.payableAmount.amount);
  }
  return Array.from(byUnit.entries()).map(([unitId, payableAmount]) => ({ unitId, payableAmount }));
}

export interface OwnerNextInstallment {
  label: string;
  dueDate: string;
  amount: number;
  status: "upcoming" | "due" | "overdue" | "partially-paid";
}

/** Shared by `getOwnerNextInstallment` and `getOwnerInstallmentSchedule` — every installment the owner owes, each with its live paid/outstanding/status computed the same way the admin's Cost Allocation screens do. */
async function getOwnerInstallmentsWithState(ownerType: OwnerType, ownerId: ID, projectId?: ID) {
  const [rows, contributionPayments] = await Promise.all([getOwnerInstallments(ownerType, ownerId, projectId), contributionPaymentRepository.list()]);

  return rows
    .filter((r): r is { obligation: (typeof rows)[number]["obligation"]; installment: NonNullable<(typeof rows)[number]["installment"]> } => !!r.installment)
    .map(({ obligation, installment }) => {
      const paid = contributionPayments
        .filter((p) => p.installmentObligationId === obligation.id)
        .reduce((sum, p) => sum + p.amount.amount, 0);
      const state = computeInstallmentObligationState(obligation, installment, paid);
      return { obligation, installment, paid, state };
    })
    .sort((a, b) => a.installment.dueDate.localeCompare(b.installment.dueDate));
}

/** The dashboard's "Next Installment" card — the single nearest not-yet-fully-paid installment. `null` when the owner has nothing outstanding. `projectId` scopes to one property, same as `getOwnerOutstanding`. */
export async function getOwnerNextInstallment(ownerType: OwnerType, ownerId: ID, projectId?: ID): Promise<OwnerNextInstallment | null> {
  const rows = await getOwnerInstallmentsWithState(ownerType, ownerId, projectId);
  const next = rows.find((r) => r.state.status !== "paid");
  if (!next) return null;

  return {
    label: next.installment.label,
    dueDate: next.installment.dueDate,
    amount: next.state.outstanding,
    status: next.state.status === "upcoming" || next.state.status === "due" || next.state.status === "overdue" || next.state.status === "partially-paid"
      ? next.state.status
      : "upcoming",
  };
}

export interface OwnerInstallmentRow {
  id: ID;
  label: string;
  dueDate: string;
  payableAmount: number;
  paidAmount: number;
  outstanding: number;
  status: "paid" | "upcoming" | "due" | "overdue" | "partially-paid";
}

/** Payments page's full schedule — every installment the owner owes, nearest due date first. `projectId` scopes to one property, same as `getOwnerOutstanding`. */
export async function getOwnerInstallmentSchedule(ownerType: OwnerType, ownerId: ID, projectId?: ID): Promise<OwnerInstallmentRow[]> {
  const rows = await getOwnerInstallmentsWithState(ownerType, ownerId, projectId);
  return rows.map(({ obligation, installment, paid, state }) => ({
    id: obligation.id,
    label: installment.label,
    dueDate: installment.dueDate,
    payableAmount: obligation.payableAmount.amount,
    paidAmount: paid,
    outstanding: state.outstanding,
    status: state.status,
  }));
}

export interface OwnerAdjustment {
  id: ID;
  type: "discount" | "waiver" | "additional-charge" | "correction" | "refund";
  /** Signed — negative reduces what's owed (discount/waiver/refund/a negative correction), positive increases it. Never re-signed or reinterpreted here; shown exactly as the admin recorded it. */
  amount: number;
  reason: string;
  date: string;
  /** Which construction goal this adjustment applies to — e.g. "Piling Cost — Block A". */
  allocationTitle: string;
}

/** Chapter 3 Prompt 3 §15 — real `ContributionAdjustment` rows only, scoped to the owner's own contributions (never another owner's). `projectId` scopes to one property, same as `getOwnerOutstanding`. */
export async function getOwnerAdjustments(ownerType: OwnerType, ownerId: ID, projectId?: ID): Promise<OwnerAdjustment[]> {
  const [contributions, allocations, adjustments] = await Promise.all([
    ownerContributionRepository.list(),
    costAllocationRepository.list(),
    contributionAdjustmentRepository.list(),
  ]);
  const allocationsById = new Map(allocations.map((a) => [a.id, a]));
  const ownContributionIds = new Set(
    contributions
      .filter((c) => c.ownerType === ownerType && c.ownerId === ownerId)
      .filter((c) => !projectId || allocationsById.get(c.costAllocationId)?.projectId === projectId)
      .map((c) => c.id),
  );
  const contributionsById = new Map(contributions.map((c) => [c.id, c]));

  return adjustments
    .filter((a) => ownContributionIds.has(a.contributionId))
    .map((a) => {
      const contribution = contributionsById.get(a.contributionId);
      const allocation = contribution ? allocationsById.get(contribution.costAllocationId) : undefined;
      return {
        id: a.id,
        type: a.type,
        amount: a.amount.amount,
        reason: a.reason,
        date: a.createdAt,
        allocationTitle: allocation?.title ?? "Construction Payment Plan",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface OwnerPaymentHistoryEntry {
  id: ID;
  /** Preserves the Prompt 3 §17 distinction — a construction contribution and a property/sale payment are different financial concepts and are never merged silently. */
  category: "construction" | "property";
  label: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  receiptNumber?: string;
  /** An owner-visible `Document` (ownerType "transaction") filed against this exact payment, if the admin attached one — never a fabricated receipt. */
  receiptUrl?: string;
  receiptName?: string;
}

/**
 * Every real, owner-scoped payment record — `ContributionPayment` (the
 * construction goal system, every owner type) and, for customers only,
 * `CustomerPayment` (the unit sale/price system) — merged into one
 * chronological list but each entry keeps its own `category` so the two
 * are never visually conflated. `projectId` scopes to one property.
 */
export async function getOwnerPaymentHistory(ownerType: OwnerType, ownerId: ID, projectId?: ID): Promise<OwnerPaymentHistoryEntry[]> {
  const [contributions, allocations, contributionPayments, goalInstallments, obligations, customerPayments, documents] = await Promise.all([
    ownerContributionRepository.list(),
    costAllocationRepository.list(),
    contributionPaymentRepository.list(),
    goalInstallmentRepository.list(),
    ownerInstallmentObligationRepository.list(),
    ownerType === "customer" ? customerPaymentRepository.list() : Promise.resolve([]),
    documentRepository.list(),
  ]);

  const allocationsById = new Map(allocations.map((a) => [a.id, a]));
  const goalInstallmentsById = new Map(goalInstallments.map((i) => [i.id, i]));
  const obligationsById = new Map(obligations.map((o) => [o.id, o]));
  const ownContributionIds = new Set(
    contributions
      .filter((c) => c.ownerType === ownerType && c.ownerId === ownerId)
      .filter((c) => !projectId || allocationsById.get(c.costAllocationId)?.projectId === projectId)
      .map((c) => c.id),
  );

  const receiptFor = (paymentId: ID) => {
    const doc = documents.find((d) => d.ownerType === "transaction" && d.ownerId === paymentId && isOwnerVisible(d));
    return doc ? { receiptUrl: doc.fileUrl, receiptName: doc.name } : {};
  };

  const construction: OwnerPaymentHistoryEntry[] = contributionPayments
    .filter((p) => ownContributionIds.has(p.contributionId))
    .map((p) => ({
      id: p.id,
      category: "construction" as const,
      label: (() => {
        const obligation = p.installmentObligationId ? obligationsById.get(p.installmentObligationId) : undefined;
        const installment = obligation ? goalInstallmentsById.get(obligation.goalInstallmentId) : undefined;
        return installment?.label ?? "Construction Payment";
      })(),
      date: p.date,
      amount: p.amount.amount,
      method: p.method,
      reference: p.reference,
      receiptNumber: p.receiptNumber,
      ...receiptFor(p.id),
    }));

  const property: OwnerPaymentHistoryEntry[] =
    ownerType === "customer"
      ? customerPayments
          .filter((p) => p.customerId === ownerId)
          .filter((p) => !projectId || p.projectId === projectId)
          .map((p) => ({
            id: p.id,
            category: "property" as const,
            label: p.category || "Property Payment",
            date: p.date,
            amount: p.amount.amount,
            method: p.method,
            reference: p.reference,
            receiptNumber: p.receiptNumber,
            ...receiptFor(p.id),
          }))
      : [];

  return [...construction, ...property].sort((a, b) => b.date.localeCompare(a.date));
}

export interface OwnerSaleSummary {
  saleId: ID;
  unitId: ID;
  unitNumber: string;
  projectName: string;
  /** The flat's price, what has been received against it, and what is left — all computed from the real sale and the payments the admin recorded. */
  price: number;
  paid: number;
  remaining: number;
  percentPaid: number;
  /** Every payment received for this flat, newest first, with the full detail the admin entered. */
  payments: OwnerPaymentHistoryEntry[];
  /** The price originally agreed, and any later changes the office made (negative = the price came down). */
  agreedPrice: number;
  adjustments: { id: ID; date: string; amount: number; reason: string }[];
  /** The scheduled installments of this flat, in due order, each with its live status (paid / overdue / due soon / upcoming). */
  installments: { id: ID; number: number; dueDate: string; amount: number; status: LiveInstallmentStatus; paidDate?: string; paidAmount: number; remaining: number }[];
  /** False when the office has switched this flat's money details off for the owner: every figure above is then blank, never sent to the page. */
  visible: boolean;
}

/**
 * The flat-purchase side of an owner's money (customers only): per sale, the
 * price, the total received and the remaining balance, plus the full list of
 * payments behind it. Separate from the construction contribution figures —
 * buying the flat and contributing to construction are different obligations.
 */
export async function getOwnerSaleSummaries(ownerType: OwnerType, ownerId: ID): Promise<OwnerSaleSummary[]> {
  if (ownerType !== "customer") return [];
  const [allSales, payments, units, projects, documents, allInstallments] = await Promise.all([
    saleRepository.list(),
    customerPaymentRepository.list(),
    unitRepository.list(),
    projectRepository.list(),
    documentRepository.list(),
    installmentRepository.list(),
  ]);
  const ownSales = allSales.filter((x) => x.customerId === ownerId && x.status !== "cancelled");

  return ownSales
    .map((sale) => {
      const unit = units.find((u) => u.id === sale.unitId);
      const summary = summarizeSale(sale, ownSales, payments);
      if (sale.hideFromOwner) {
        // Switched off by the office: nothing about the money leaves the server.
        return {
          saleId: sale.id,
          unitId: sale.unitId,
          unitNumber: unit?.unitNumber ?? "—",
          projectName: projects.find((pr) => pr.id === sale.projectId)?.name ?? "—",
          price: 0,
          paid: 0,
          remaining: 0,
          percentPaid: 0,
          payments: [],
          agreedPrice: 0,
          adjustments: [],
          installments: [],
          visible: false,
        };
      }
      return {
        agreedPrice: summary.agreedPrice,
        adjustments: [...(sale.priceAdjustments ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
        installments: (() => {
          const own = allInstallments.filter((i) => i.saleId === sale.id || (!i.saleId && i.contractId === sale.id));
          // Money is paid against the flat; fill the installments in due order so a part-payment shows what is still owed on it.
          const shares = allocateInstallments(own.map((i) => ({ id: i.id, amount: i.amount.amount, status: i.status, paidDate: i.paidDate, dueDate: i.dueDate })), summary.paid);
          return own
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.installmentNumber - b.installmentNumber)
            .map((i) => {
              const share = shares.get(i.id)!;
              return { id: i.id, number: i.installmentNumber, dueDate: i.dueDate, amount: i.amount.amount, status: share.status, paidDate: i.paidDate, paidAmount: share.paidAmount, remaining: share.remaining };
            });
        })(),
        visible: true,
        saleId: sale.id,
        unitId: sale.unitId,
        unitNumber: unit?.unitNumber ?? "—",
        projectName: projects.find((pr) => pr.id === sale.projectId)?.name ?? "—",
        price: summary.price,
        paid: summary.paid,
        remaining: summary.remaining,
        percentPaid: summary.percentPaid,
        payments: summary.payments.map((pay) => {
          const doc = documents.find((d) => d.ownerType === "transaction" && d.ownerId === pay.id && isOwnerVisible(d));
          return {
            id: pay.id,
            category: "property" as const,
            label: pay.category || "Property Payment",
            date: pay.date,
            amount: pay.amount.amount,
            method: pay.method,
            reference: pay.reference,
            receiptNumber: pay.receiptNumber,
            ...(doc ? { receiptUrl: doc.fileUrl, receiptName: doc.name } : {}),
          };
        }),
      };
    })
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
}

export interface OwnerProjectProgress {
  projectId: ID;
  projectName: string;
  averageProgress: number | null;
  /** Name/status of the earliest not-yet-finished phase — undefined once every configured phase is complete. Never includes cost figures, only the admin-configured phase's public-facing name/status. */
  currentStageName?: string;
  currentStageProgress?: number;
  nextStageName?: string;
}

export async function getOwnerConstructionProgress(ownerType: OwnerType, ownerId: ID): Promise<OwnerProjectProgress[]> {
  const [allProjects, ownUnits] = await Promise.all([getOwnerProjects(ownerType, ownerId), getOwnerUnits(ownerType, ownerId)]);
  // A project is left out when the office switched construction off for every flat this owner has in it.
  const projects = allProjects.filter((p) => {
    const mine = ownUnits.filter((u) => u.projectId === p.id);
    return mine.length === 0 || mine.some((u) => !u.hideConstructionFromOwner);
  });
  return Promise.all(
    projects.map(async (p) => {
      const stats = await getProjectWorkspaceStats(p.id);
      return {
        projectId: p.id,
        projectName: p.name,
        averageProgress: stats.averageConstructionProgress,
        currentStageName: stats.currentConstructionStage?.name,
        currentStageProgress: stats.currentConstructionStage?.progress,
        nextStageName: stats.nextConstructionStage?.name,
      };
    }),
  );
}

export interface OwnerConstructionPhase {
  id: ID;
  name: string;
  order: number;
  status: ConstructionStatus;
  progress: number;
  targetEndDate?: string;
  actualEndDate?: string;
  isDelayed: boolean;
  daysDelayed: number;
}

export interface OwnerConstructionMilestone {
  id: ID;
  name: string;
  targetDate?: string;
  completedDate?: string;
  status: "upcoming" | "completed";
}

/** A revised target date — never the admin's free-text `reason` (Prompt 4 §13: no internal blame/contractor-dispute commentary reaches the owner, only the calm before/after dates). */
export interface OwnerScheduleUpdate {
  id: ID;
  phaseName: string;
  previousTargetDate: string;
  newTargetDate: string;
  date: string;
}

export interface OwnerConstructionUpdate {
  id: ID;
  date: string;
  activity: string;
  phaseName?: string;
  photos: { url: string; name: string }[];
}

export interface OwnerConstructionDetail {
  /** Which level the headline `progress` actually represents — Prompt 4 §9/§25: never let a project-wide number silently masquerade as "your unit's" progress. */
  scopeLevel: "unit" | "floor" | "building" | "project";
  scopeLabel: string;
  progress: number | null;
  currentStage: OwnerConstructionPhase | null;
  nextStageName: string | null;
  /** The full project phase sequence ("Project Journey") — always project-wide, regardless of `scopeLevel`, since the journey itself is one shared sequence. */
  phases: OwnerConstructionPhase[];
  milestones: OwnerConstructionMilestone[];
  scheduleUpdates: OwnerScheduleUpdate[];
  updates: OwnerConstructionUpdate[];
  galleryPhotos: { url: string; name: string }[];
  expectedCompletionDate?: string;
  isHandedOver: boolean;
}

/**
 * The dedicated Construction page's data (Prompt 4) — every figure is
 * read from the exact same Chapter 2 engine the Admin's own Construction
 * dashboard uses (`derivePhaseProgress`/`computeOverallProgress`/
 * `deriveScheduleDelay`, `lib/constructionProgress.ts`), just scoped down
 * to what this one owner is authorized to see and re-labelled in owner
 * language. No second progress-calculation engine.
 */
export async function getOwnerConstructionDetail(ownerType: OwnerType, ownerId: ID, unitId: ID): Promise<OwnerConstructionDetail | null> {
  const unitIds = await getOwnerUnitIds(ownerType, ownerId);
  if (!unitIds.has(unitId)) return null;
  if ((await unitRepository.findById(unitId))?.hideConstructionFromOwner) return null;

  const [units, projects, buildings, floors, allPhases, allTasks, allMilestones, allRevisions, allActivity, allDocuments] = await Promise.all([
    unitRepository.list(),
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    constructionPhaseRepository.list(),
    constructionTaskRepository.list(),
    milestoneRepository.list(),
    scheduleRevisionRepository.list(),
    constructionActivityLogRepository.list(),
    documentRepository.list(),
  ]);

  const unit = units.find((u) => u.id === unitId);
  if (!unit) return null;
  const project = projects.find((p) => p.id === unit.projectId) ?? null;
  const building = buildings.find((b) => b.id === unit.buildingId) ?? null;
  const floor = floors.find((f) => f.id === unit.floorId) ?? null;

  const projectPhases = allPhases.filter((p) => p.projectId === unit.projectId).sort((a, b) => a.order - b.order);
  const projectTasks = allTasks.filter((t) => t.projectId === unit.projectId);
  const projectMilestones = allMilestones.filter((m) => m.projectId === unit.projectId);

  const effectiveProgressOf = (phase: (typeof projectPhases)[number]) =>
    derivePhaseProgress(phase, projectTasks.filter((t) => t.phaseId === phase.id), projectMilestones.filter((m) => m.relatedPhaseId === phase.id));

  // §9 — most specific level with real scoped data; unscoped phases count toward every level (they're project-wide by definition), but the LABEL only claims a level when at least one phase is genuinely scoped there.
  let scopeLevel: OwnerConstructionDetail["scopeLevel"] = "project";
  let scopeLabel = project?.name ?? "This project";
  let scopePhases = projectPhases;
  if (projectPhases.some((p) => p.unitId === unit.id)) {
    scopeLevel = "unit";
    scopeLabel = `Unit ${unit.unitNumber}`;
    scopePhases = projectPhases.filter((p) => !p.unitId || p.unitId === unit.id);
  } else if (floor && projectPhases.some((p) => p.floorId === floor.id)) {
    scopeLevel = "floor";
    scopeLabel = floor.label;
    scopePhases = projectPhases.filter((p) => !p.floorId || p.floorId === floor.id);
  } else if (building && projectPhases.some((p) => p.buildingId === building.id)) {
    scopeLevel = "building";
    scopeLabel = building.name;
    scopePhases = projectPhases.filter((p) => !p.buildingId || p.buildingId === building.id);
  }

  const { progress } = computeOverallProgress(scopePhases, effectiveProgressOf);

  const toOwnerPhase = (phase: (typeof projectPhases)[number]): OwnerConstructionPhase => {
    const delay = deriveScheduleDelay(phase.endDate, phase.actualEndDate, phase.status);
    return {
      id: phase.id,
      name: phase.name,
      order: phase.order,
      status: phase.status,
      progress: effectiveProgressOf(phase),
      targetEndDate: phase.endDate,
      actualEndDate: phase.actualEndDate,
      isDelayed: delay.isDelayed,
      daysDelayed: delay.daysDelayed,
    };
  };

  const phases = projectPhases.map(toOwnerPhase);
  const currentPhaseIndex = projectPhases.findIndex((p) => p.status !== "completed" && p.status !== "cancelled");
  const currentStage = currentPhaseIndex === -1 ? null : phases[currentPhaseIndex];
  const nextStageName = currentPhaseIndex === -1 ? null : (projectPhases[currentPhaseIndex + 1]?.name ?? null);

  const milestones: OwnerConstructionMilestone[] = projectMilestones
    .map((m) => ({ id: m.id, name: m.name, targetDate: m.targetDate, completedDate: m.completedDate, status: m.status }))
    .sort((a, b) => (a.completedDate ?? a.targetDate ?? "").localeCompare(b.completedDate ?? b.targetDate ?? ""));

  const phaseNameById = new Map(projectPhases.map((p) => [p.id, p.name]));
  const scheduleUpdates: OwnerScheduleUpdate[] = allRevisions
    .filter((r) => r.targetType === "phase" && r.projectId === unit.projectId)
    .map((r) => ({
      id: r.id,
      phaseName: phaseNameById.get(r.targetId) ?? "Construction Schedule",
      previousTargetDate: r.previousTargetDate,
      newTargetDate: r.newTargetDate,
      date: r.createdAt,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const photosFor = (activityLogId: ID) =>
    allDocuments
      .filter((d) => d.ownerType === "constructionActivity" && d.ownerId === activityLogId && isOwnerVisible(d))
      .map((d) => ({ url: d.fileUrl, name: d.name }));

  const updates: OwnerConstructionUpdate[] = allActivity
    .filter((a) => a.projectId === unit.projectId)
    .map((a) => ({
      id: a.id,
      date: a.date,
      activity: a.activity,
      phaseName: a.phaseId ? phaseNameById.get(a.phaseId) : undefined,
      photos: photosFor(a.id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const galleryPhotos = updates.flatMap((u) => u.photos);

  return {
    scopeLevel,
    scopeLabel,
    progress,
    currentStage,
    nextStageName,
    phases,
    milestones,
    scheduleUpdates,
    updates,
    galleryPhotos,
    expectedCompletionDate: project?.handoverDate ?? project?.expectedCompletionDate,
    isHandedOver: !!project?.handoverDate,
  };
}

/**
 * Owner-visible only (`isOwnerVisible`) — internal/restricted documents
 * about the owner's own units/records are never included, per the brief's
 * explicit visibility rule. `unitId` narrows to documents tied to that one
 * unit (for the "My Property" page's per-property count) — the owner's
 * own general documents (not tied to any specific unit) are excluded in
 * that mode, since they aren't naturally "this property's" documents.
 */
export async function getOwnerDocuments(ownerType: OwnerType, ownerId: ID, unitId?: ID) {
  const [allDocuments, unitIds] = await Promise.all([documentRepository.list(), getOwnerUnitIds(ownerType, ownerId)]);
  // `unitId` must still belong to this owner — every sibling function that
  // takes one (getOwnerUnitDetail, getOwnerConstructionDetail) re-checks
  // `unitIds.has(unitId)` before trusting it; this one didn't, which would
  // let a caller that ever passes a raw/unverified route param through
  // return another owner's documents for that unit.
  if (unitId && !unitIds.has(unitId)) return [];
  return allDocuments.filter((d) => {
    if (!isOwnerVisible(d)) return false;
    if (unitId) return d.ownerType === "unit" && d.ownerId === unitId;
    if (d.ownerType === ownerType && d.ownerId === ownerId) return true;
    if (d.ownerType === "unit" && unitIds.has(d.ownerId)) return true;
    return false;
  });
}

/** Resolves through `User.linkedCustomerId`/`linkedShareholderId`/`linkedLandownerId` — an owner only has notifications once they have a portal login account linked to their owner record. */
export async function getOwnerNotifications(ownerType: OwnerType, ownerId: ID) {
  const users = await userRepository.list();
  const linkedField =
    ownerType === "customer" ? "linkedCustomerId" : ownerType === "shareholder" ? "linkedShareholderId" : "linkedLandownerId";
  const linkedUser = users.find((u) => u[linkedField] === ownerId);
  if (!linkedUser) return [];
  const notifications = await notificationRepository.list();
  return notifications.filter((n) => n.recipientUserId === linkedUser.id && n.status !== "archived");
}
