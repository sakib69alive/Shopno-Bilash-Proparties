import { costAllocationRepository, ownerContributionRepository, contributionAdjustmentRepository } from "@/features/costAllocations/repository";
import { computeContributionState } from "@/lib/contributionStatus";
import { filterToVisibleProjects } from "@/lib/projectScope";
import type { CostAllocation, OwnerContribution } from "@/types/finance/costAllocation";
import type { User } from "@/types/user";

export interface ContributionReportRow {
  contribution: OwnerContribution;
  allocation: CostAllocation;
  outstanding: number;
  fineAmount: number;
  totalDue: number;
  status: "paid" | "partially-paid" | "pending" | "overdue";
}

export interface OwnerContributionsReport {
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
  totalFines: number;
  overdueCount: number;
  /** Every contribution that isn't fully paid, most urgent (overdue, then largest total due) first. */
  outstandingRows: ContributionReportRow[];
}

/**
 * A computed view, not a stored record — same reasoning `getReportsSummary`
 * already documents. Reuses `computeContributionState`, the one place
 * paid/overdue/fine logic lives, rather than re-deriving it here.
 */
export async function getOwnerContributionsReport(user: User, projectId?: string): Promise<OwnerContributionsReport> {
  const [allAllocations, allContributions, allAdjustments] = await Promise.all([
    costAllocationRepository.list(),
    ownerContributionRepository.list(),
    contributionAdjustmentRepository.list(),
  ]);
  let allocations = filterToVisibleProjects(user, allAllocations).filter((row) => row.status === "generated");
  let contributions = filterToVisibleProjects(user, allContributions);
  if (projectId) {
    allocations = allocations.filter((a) => a.projectId === projectId);
    contributions = contributions.filter((c) => c.projectId === projectId);
  }
  const allocationsById = new Map(allocations.map((a) => [a.id, a]));
  const adjustmentsByContribution = new Map<string, typeof allAdjustments>();
  for (const adjustment of allAdjustments) {
    const list = adjustmentsByContribution.get(adjustment.contributionId) ?? [];
    list.push(adjustment);
    adjustmentsByContribution.set(adjustment.contributionId, list);
  }

  let totalPayable = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalFines = 0;
  let overdueCount = 0;
  const outstandingRows: ContributionReportRow[] = [];

  for (const contribution of contributions) {
    const allocation = allocationsById.get(contribution.costAllocationId);
    if (!allocation) continue;

    const state = computeContributionState(contribution, allocation, adjustmentsByContribution.get(contribution.id) ?? []);
    // effectivePayable (payableAmount + adjustments), not the raw
    // payableAmount — otherwise this total doesn't reconcile with
    // totalOutstanding below, which already includes adjustments via
    // `state.outstanding`, and overstates what owners actually owe
    // whenever a waiver/discount/correction has been recorded.
    totalPayable += state.effectivePayable;
    totalPaid += contribution.paidAmount.amount;
    totalOutstanding += state.outstanding;
    totalFines += state.fineAmount;
    if (state.status === "overdue") overdueCount += 1;

    if (state.status !== "paid") {
      outstandingRows.push({ contribution, allocation, outstanding: state.outstanding, fineAmount: state.fineAmount, totalDue: state.totalDue, status: state.status });
    }
  }

  outstandingRows.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue") return -1;
    if (b.status === "overdue" && a.status !== "overdue") return 1;
    return b.totalDue - a.totalDue;
  });

  return { totalPayable, totalPaid, totalOutstanding, totalFines, overdueCount, outstandingRows };
}
