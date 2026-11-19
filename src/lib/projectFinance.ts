import type { Purchase } from "@/types/procurement";
import type { ProjectExpense, ProjectBudget, FinancialAdjustment } from "@/types/finance/project";
import type { ContractorPayment } from "@/types/contractor";
import { countsTowardActualCost } from "@/lib/transactionStatus";

export interface ProjectCostSummary {
  materialCost: number;
  contractorCost: number;
  otherExpenseCost: number;
  actualCost: number;
  budgeted: number;
  variance: number;
  utilizationPct: number | null;
  budgetStatus: "under" | "on" | "over" | "no-budget";
}

export function indexCostAdjustments(adjustments: FinancialAdjustment[]) {
  const changes = new Map<string, number>();
  for (const row of adjustments) {
    const key = `${row.targetType}:${row.targetId}`;
    changes.set(key, (changes.get(key) ?? 0) + row.amount.amount);
  }
  return changes;
}

/**
 * Whole-project version of `constructionProgress.ts`'s `computePhaseActualCost`
 * — same three real transaction sources (Purchases, ProjectExpenses,
 * ContractorPayments), summed across every phase of the project instead of
 * one. `budgeted` is the sum of every `ProjectBudget` row for the project
 * (project-level rows with no `phaseId`, or every phase's line — caller
 * decides which `budgets` to pass in). Thresholds default to 80/100 (Prompt
 * 6 §5's suggested defaults) when a row doesn't set its own.
 */
export function computeProjectActualCost(
  purchases: Purchase[],
  expenses: ProjectExpense[],
  payments: ContractorPayment[],
  budgets: ProjectBudget[],
  adjustments: FinancialAdjustment[] = [],
): ProjectCostSummary {
  const changes = indexCostAdjustments(adjustments);
  const materialCost = purchases.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.total.amount, 0);
  const otherExpenseCost = expenses.filter((e) => countsTowardActualCost(e.status)).reduce((s, e) => s + e.amount.amount + (changes.get(`expense:${e.id}`) ?? 0), 0);
  const contractorCost = payments.filter((p) => countsTowardActualCost(p.status)).reduce((s, p) => s + p.amount.amount + (changes.get(`contractorPayment:${p.id}`) ?? 0), 0);
  const actualCost = materialCost + otherExpenseCost + contractorCost;

  const budgeted = budgets.reduce((s, b) => s + b.budgeted.amount, 0);
  const variance = actualCost - budgeted;
  const utilizationPct = budgeted > 0 ? Math.round((100 * actualCost) / budgeted) : null;

  const warningThresholdPct = budgets.find((b) => b.warningThresholdPct !== undefined)?.warningThresholdPct ?? 80;
  const overThresholdPct = budgets.find((b) => b.overThresholdPct !== undefined)?.overThresholdPct ?? 100;

  let budgetStatus: ProjectCostSummary["budgetStatus"] = "no-budget";
  if (budgeted > 0 && utilizationPct !== null) {
    budgetStatus = utilizationPct >= overThresholdPct ? "over" : utilizationPct >= warningThresholdPct ? "on" : "under";
  }

  return { materialCost, contractorCost, otherExpenseCost, actualCost, budgeted, variance, utilizationPct, budgetStatus };
}
