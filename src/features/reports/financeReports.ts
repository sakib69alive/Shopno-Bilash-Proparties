import { customerPaymentRepository, financialAdjustmentRepository, projectExpenseRepository } from "@/features/finance/repository";
import { contractorPaymentRepository, contractorRepository } from "@/features/contractors/repository";
import { contributionPaymentRepository, ownerContributionRepository } from "@/features/costAllocations/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterToVisibleProjects, canAccessProjectOptional } from "@/lib/projectScope";
import type { User } from "@/types/user";
import type { ProjectExpense } from "@/types/finance/project";
import type { ContractorPayment } from "@/types/contractor";
import { countsTowardActualCost } from "@/lib/transactionStatus";
import { indexCostAdjustments } from "@/lib/projectFinance";

export interface CategoryReportRow {
  category: string;
  total: number;
  count: number;
  expenses: ProjectExpense[];
}

/** Prompt 6 §11 — Category Report, live-grouped from `ProjectExpense`, never a stored aggregate. */
export async function getExpenseCategoryReport(user: User, projectId?: string): Promise<CategoryReportRow[]> {
  const [all, adjustments] = await Promise.all([projectExpenseRepository.list(), financialAdjustmentRepository.list()]);
  const visible = filterToVisibleProjects(user, all).filter((e) => !projectId || e.projectId === projectId);
  const changes = indexCostAdjustments(filterToVisibleProjects(user, adjustments));

  const byCategory = new Map<string, ProjectExpense[]>();
  for (const expense of visible) {
    const list = byCategory.get(expense.category) ?? [];
    list.push(expense);
    byCategory.set(expense.category, list);
  }

  return [...byCategory.entries()]
    .map(([category, expenses]) => ({
      category,
      total: expenses.reduce((s, e) => s + (countsTowardActualCost(e.status) ? e.amount.amount + (changes.get(`expense:${e.id}`) ?? 0) : 0), 0),
      count: expenses.length,
      expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface ContractorPaymentReportRow {
  payment: ContractorPayment;
  contractorName: string;
  projectName: string;
}

/** Prompt 6 §11 — Contractor Payment Report, joined client-side to Contractor/Project names like every other explorer in this app. */
export async function getContractorPaymentReport(user: User, projectId?: string): Promise<ContractorPaymentReportRow[]> {
  const [allPayments, contractors, projects] = await Promise.all([
    contractorPaymentRepository.list(),
    contractorRepository.list(),
    projectRepository.list(),
  ]);

  const visible = allPayments
    .filter((p) => canAccessProjectOptional(user, p.projectId))
    .filter((p) => !projectId || p.projectId === projectId);

  const contractorsById = new Map(contractors.map((c) => [c.id, c.name]));
  const projectsById = new Map(projects.map((p) => [p.id, p.name]));

  return visible
    .map((payment) => ({
      payment,
      contractorName: contractorsById.get(payment.contractorId) ?? "Unknown contractor",
      projectName: projectsById.get(payment.projectId) ?? "Unknown project",
    }))
    .sort((a, b) => b.payment.date.localeCompare(a.payment.date));
}

export interface CashFlowRow {
  month: string; // "YYYY-MM"
  received: number;
  spent: number;
  net: number;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Prompt 6 §9/§11 — Monthly Cash Flow: "received" sums real `CustomerPayment`
 * + `ContributionPayment` rows, "spent" sums real `ProjectExpense` +
 * `ContractorPayment` rows. A simple in/out ledger, not a profit/loss
 * statement (Prompt 6 §10 is explicit that collections − expenses ≠ profit
 * unless a real accounting model backs it — this report never claims that).
 */
export async function getMonthlyCashFlow(user: User, projectId?: string, monthsBack = 6): Promise<CashFlowRow[]> {
  const [allCustomerPayments, allContributionPayments, allContributions, allExpenses, allContractorPayments] = await Promise.all([
    customerPaymentRepository.list(),
    contributionPaymentRepository.list(),
    ownerContributionRepository.list(),
    projectExpenseRepository.list(),
    contractorPaymentRepository.list(),
  ]);

  const visibleContributionIds = new Set(
    filterToVisibleProjects(user, allContributions)
      .filter((c) => !projectId || c.projectId === projectId)
      .map((c) => c.id),
  );

  const customerPayments = allCustomerPayments
    .filter((p) => canAccessProjectOptional(user, p.projectId))
    .filter((p) => !projectId || p.projectId === projectId);
  const contributionPayments = allContributionPayments.filter((p) => visibleContributionIds.has(p.contributionId));
  const expenses = filterToVisibleProjects(user, allExpenses)
    .filter((e) => (!projectId || e.projectId === projectId) && countsTowardActualCost(e.status));
  const contractorPayments = allContractorPayments
    .filter((p) => canAccessProjectOptional(user, p.projectId))
    .filter((p) => (!projectId || p.projectId === projectId) && countsTowardActualCost(p.status));

  const months: string[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const receivedByMonth = new Map<string, number>();
  for (const p of customerPayments) receivedByMonth.set(monthKey(p.date), (receivedByMonth.get(monthKey(p.date)) ?? 0) + p.amount.amount);
  for (const p of contributionPayments) receivedByMonth.set(monthKey(p.date), (receivedByMonth.get(monthKey(p.date)) ?? 0) + p.amount.amount);

  const spentByMonth = new Map<string, number>();
  for (const e of expenses) spentByMonth.set(monthKey(e.date), (spentByMonth.get(monthKey(e.date)) ?? 0) + e.amount.amount);
  for (const p of contractorPayments) spentByMonth.set(monthKey(p.date), (spentByMonth.get(monthKey(p.date)) ?? 0) + p.amount.amount);

  return months.map((month) => {
    const received = Math.round((receivedByMonth.get(month) ?? 0) * 100);
    const spent = Math.round((spentByMonth.get(month) ?? 0) * 100);
    return { month, received: received / 100, spent: spent / 100, net: (received - spent) / 100 };
  });
}
