import { unitRepository } from "@/features/units/repository";
import { constructionPhaseRepository, constructionTaskRepository, milestoneRepository } from "@/features/construction/repository";
import { costAllocationRepository, ownerContributionRepository, contributionAdjustmentRepository } from "@/features/costAllocations/repository";
import { stockMovementRepository, purchaseRepository, materialRepository, materialThresholdRepository } from "@/features/procurement/repository";
import { financialAdjustmentRepository, projectExpenseRepository, projectBudgetRepository } from "@/features/finance/repository";
import { contractorPaymentRepository } from "@/features/contractors/repository";
import { saleRepository } from "@/features/sales/repository";
import { getRecentOwnershipRecords } from "@/features/ownership/queries";
import { computeContributionState, deriveGoalCollectionStatus, type GoalCollectionStatus } from "@/lib/contributionStatus";
import { currentStockOf, isLowStock } from "@/lib/materialStock";
import { derivePhaseProgress, deriveScheduleDelay, computeOverallProgress } from "@/lib/constructionProgress";
import { computeProjectActualCost, type ProjectCostSummary } from "@/lib/projectFinance";
import type { UnitStatus } from "@/types/unit";
import type { OwnershipRecord } from "@/types/ownership";
import type { ConstructionStatus } from "@/types/construction";

export interface CurrentGoalInfo {
  id: string;
  title: string;
  dueDate: string;
  status: GoalCollectionStatus;
  collectionPercent: number;
  target: number;
  collected: number;
}

export interface NextGoalInfo {
  id: string;
  title: string;
  allocationDate: string;
  target: number;
}

export interface CurrentStageInfo {
  id: string;
  name: string;
  status: ConstructionStatus;
  progress: number;
  targetEndDate?: string;
  isDelayed: boolean;
  daysDelayed: number;
}

export interface NextStageInfo {
  id: string;
  name: string;
  startDate?: string;
}

export interface ProjectWorkspaceStats {
  unitTotal: number;
  unitsByStatus: Partial<Record<UnitStatus, number>>;
  /** null = no units yet — distinct from 0% occupancy on units that exist. */
  unitOccupancyPercent: number | null;
  constructionPhaseCount: number;
  /** null = no phases yet — distinct from 0% progress on phases that exist. */
  averageConstructionProgress: number | null;
  contributionsPayable: number;
  contributionsPaid: number;
  contributionsOutstanding: number;
  overdueContributionCount: number;
  materialsTrackedCount: number;
  /** Sum of `Purchase.total` for this project, excluding cancelled purchases — the real material procurement cost, distinct from Construction Goal collections. */
  materialPurchaseCost: number;
  /** Count of materials in this project below their configured low-stock threshold (materials with no threshold set are never counted). */
  lowStockMaterialCount: number;
  /** Count of phases past their current target date and not yet completed/cancelled — derived, see `deriveScheduleDelay`. */
  delayedPhaseCount: number;
  /** The earliest-ordered phase that's neither completed nor cancelled — undefined once every phase is finished. */
  currentConstructionStage?: CurrentStageInfo;
  /** The next phase in order after the current one — undefined if there isn't one. */
  nextConstructionStage?: NextStageInfo;
  /** Newest first — raw rows, name resolution stays in the page component (matching `owners/page.tsx`'s own convention). */
  recentOwnershipRecords: OwnershipRecord[];
  /** The generated allocation still actively collecting, earliest due date first — undefined if none. */
  currentGoal?: CurrentGoalInfo;
  /** The next draft allocation queued up, earliest allocation date first — undefined if none. */
  nextGoal?: NextGoalInfo;
  /** Prompt 6 — whole-project Actual Cost vs Budget, same three real transaction sources as `computePhaseActualCost`, summed project-wide. */
  costSummary: ProjectCostSummary;
  /** Prompt 8 §9 — sum of `Sale.salePrice` for this project's units, excluding cancelled sales. */
  unitSalesValue: number;
}

/**
 * Computed at read time, scoped to one project — same derive-don't-store
 * approach as `getReportsSummary`/`getOwnerContributionsReport`/
 * `summarizeStock`, just narrowed to a single `projectId` instead of a
 * user's whole visible set. Shared by the Project Dashboard tab and the
 * Project List's per-row columns so both read the same numbers.
 */
export async function getProjectWorkspaceStats(projectId: string): Promise<ProjectWorkspaceStats> {
  const [units, phases, allocations, contributions, movements, adjustments, purchases, materials, thresholds, tasks, milestones, projectExpenses, contractorPayments, projectBudgets, allSales, costAdjustments] =
    await Promise.all([
      unitRepository.list(),
      constructionPhaseRepository.list(),
      costAllocationRepository.list(),
      ownerContributionRepository.list(),
      stockMovementRepository.list(),
      contributionAdjustmentRepository.list(),
      purchaseRepository.list(),
      materialRepository.list(),
      materialThresholdRepository.list(),
      constructionTaskRepository.list(),
      milestoneRepository.list(),
      projectExpenseRepository.list(),
      contractorPaymentRepository.list(),
      projectBudgetRepository.list(),
      saleRepository.list(),
      financialAdjustmentRepository.list(),
    ]);
  const adjustmentsByContribution = new Map<string, typeof adjustments>();
  for (const adjustment of adjustments) {
    const list = adjustmentsByContribution.get(adjustment.contributionId) ?? [];
    list.push(adjustment);
    adjustmentsByContribution.set(adjustment.contributionId, list);
  }

  const projectUnits = units.filter((u) => u.projectId === projectId);
  const unitsByStatus: Partial<Record<UnitStatus, number>> = {};
  for (const unit of projectUnits) {
    unitsByStatus[unit.status] = (unitsByStatus[unit.status] ?? 0) + 1;
  }
  const unitOccupancyPercent =
    projectUnits.length === 0
      ? null
      : Math.round((100 * (projectUnits.length - (unitsByStatus.available ?? 0))) / projectUnits.length);

  const recentOwnershipRecords = await getRecentOwnershipRecords(projectId, 5);

  const projectPhases = phases.filter((p) => p.projectId === projectId);
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const projectMilestones = milestones.filter((m) => m.projectId === projectId);
  const effectiveProgressOf = (phase: (typeof projectPhases)[number]) =>
    derivePhaseProgress(
      phase,
      projectTasks.filter((t) => t.phaseId === phase.id),
      projectMilestones.filter((m) => m.relatedPhaseId === phase.id),
    );
  const overallProgress = computeOverallProgress(projectPhases, effectiveProgressOf);
  const averageConstructionProgress = overallProgress.progress;

  const delayedPhaseCount = projectPhases.filter((p) => deriveScheduleDelay(p.endDate, p.actualEndDate, p.status).isDelayed).length;

  let currentConstructionStage: CurrentStageInfo | undefined;
  let nextConstructionStage: NextStageInfo | undefined;
  const orderedPhases = [...projectPhases].sort((a, b) => a.order - b.order);
  const currentIndex = orderedPhases.findIndex((p) => p.status !== "completed" && p.status !== "cancelled");
  if (currentIndex !== -1) {
    const current = orderedPhases[currentIndex];
    const delay = deriveScheduleDelay(current.endDate, current.actualEndDate, current.status);
    currentConstructionStage = {
      id: current.id,
      name: current.name,
      status: current.status,
      progress: effectiveProgressOf(current),
      targetEndDate: current.endDate,
      isDelayed: delay.isDelayed,
      daysDelayed: delay.daysDelayed,
    };
    const next = orderedPhases[currentIndex + 1];
    if (next) nextConstructionStage = { id: next.id, name: next.name, startDate: next.startDate };
  }

  const projectAllocations = allocations.filter((a) => a.projectId === projectId);
  const allocationsById = new Map(projectAllocations.map((a) => [a.id, a]));
  const projectContributions = contributions.filter((c) => allocationsById.has(c.costAllocationId));

  let contributionsPayable = 0;
  let contributionsPaid = 0;
  let contributionsOutstanding = 0;
  let overdueContributionCount = 0;
  for (const contribution of projectContributions) {
    const allocation = allocationsById.get(contribution.costAllocationId)!;
    const state = computeContributionState(contribution, allocation, adjustmentsByContribution.get(contribution.id) ?? []);
    contributionsPayable += contribution.payableAmount.amount;
    contributionsPaid += contribution.paidAmount.amount;
    contributionsOutstanding += state.outstanding;
    if (state.status === "overdue") overdueContributionCount += 1;
  }

  const projectMovements = movements.filter((m) => m.projectId === projectId);
  const materialsTrackedCount = new Set(projectMovements.map((m) => m.materialId)).size;

  const materialPurchaseCost = purchases
    .filter((p) => p.projectId === projectId && p.status !== "cancelled")
    .reduce((sum, p) => sum + p.total.amount, 0);

  const projectThresholdByMaterial = new Map(
    thresholds.filter((t) => t.projectId === projectId).map((t) => [t.materialId, t.minimumStock]),
  );
  let lowStockMaterialCount = 0;
  for (const material of materials) {
    const threshold = projectThresholdByMaterial.get(material.id);
    if (threshold === undefined) continue;
    const stock = currentStockOf(projectMovements.filter((m) => m.materialId === material.id));
    if (isLowStock(stock, threshold)) lowStockMaterialCount += 1;
  }

  let currentGoal: CurrentGoalInfo | undefined;
  const activeCandidates = projectAllocations
    .filter((a) => a.status === "generated")
    .map((allocation) => {
      const ownContributions = projectContributions.filter((c) => c.costAllocationId === allocation.id);
      const payable = ownContributions.reduce(
        (s, c) => s + computeContributionState(c, allocation, adjustmentsByContribution.get(c.id) ?? []).effectivePayable,
        0,
      );
      const paid = ownContributions.reduce((s, c) => s + c.paidAmount.amount, 0);
      const collectionPercent = payable > 0 ? Math.round((100 * paid) / payable) : 0;
      const status = deriveGoalCollectionStatus(allocation, collectionPercent);
      return { allocation, collectionPercent, status, payable, paid };
    })
    .filter((c) => c.status === "active" || c.status === "partially-funded" || c.status === "upcoming")
    .sort((a, b) => a.allocation.dueDate.localeCompare(b.allocation.dueDate));
  if (activeCandidates.length > 0) {
    const top = activeCandidates[0];
    currentGoal = {
      id: top.allocation.id,
      title: top.allocation.title,
      dueDate: top.allocation.dueDate,
      status: top.status,
      collectionPercent: top.collectionPercent,
      target: top.allocation.totalAmount.amount,
      collected: top.paid,
    };
  }

  let nextGoal: NextGoalInfo | undefined;
  const draftCandidates = projectAllocations
    .filter((a) => a.status === "draft")
    .sort((a, b) => a.allocationDate.localeCompare(b.allocationDate));
  if (draftCandidates.length > 0) {
    const top = draftCandidates[0];
    nextGoal = { id: top.id, title: top.title, allocationDate: top.allocationDate, target: top.totalAmount.amount };
  }

  const projectUnitIds = new Set(projectUnits.map((u) => u.id));
  const unitSalesValue = allSales
    .filter((s) => projectUnitIds.has(s.unitId) && s.status !== "cancelled")
    .reduce((sum, s) => sum + s.salePrice.amount, 0);

  const costSummary = computeProjectActualCost(
    purchases.filter((p) => p.projectId === projectId),
    projectExpenses.filter((e) => e.projectId === projectId),
    contractorPayments.filter((p) => p.projectId === projectId),
    projectBudgets.filter((b) => b.projectId === projectId),
    costAdjustments.filter((row) => row.projectId === projectId),
  );

  return {
    unitTotal: projectUnits.length,
    unitsByStatus,
    unitOccupancyPercent,
    constructionPhaseCount: projectPhases.length,
    averageConstructionProgress,
    contributionsPayable,
    contributionsPaid,
    contributionsOutstanding,
    overdueContributionCount,
    materialsTrackedCount,
    materialPurchaseCost,
    lowStockMaterialCount,
    delayedPhaseCount,
    currentConstructionStage,
    nextConstructionStage,
    recentOwnershipRecords,
    currentGoal,
    nextGoal,
    costSummary,
    unitSalesValue,
  };
}
