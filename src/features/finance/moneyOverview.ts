import "server-only";
import {
  customerPaymentRepository, financialAdjustmentRepository, projectBudgetRepository, projectExpenseRepository,
} from "@/features/finance/repository";
import { contractorPaymentRepository } from "@/features/contractors/repository";
import { purchaseRepository } from "@/features/procurement/repository";
import { getOwnerContributionsReport } from "@/features/reports/ownerContributions";
import { contributionPaymentRepository, goalInstallmentRepository, ownerContributionRepository, ownerInstallmentObligationRepository } from "@/features/costAllocations/repository";
import { installmentRepository } from "@/features/sales/repository";
import { getVisibleProjectIds } from "@/lib/projectScope";
import { countsTowardActualCost } from "@/lib/transactionStatus";
import { summarizeSale } from "@/lib/salePayments";
import { allocateInstallments } from "@/lib/installmentStatus";
import { indexCostAdjustments } from "@/lib/projectFinance";
import type { Sale } from "@/types/sales";
import type { User } from "@/types/user";

interface OverviewRow {
  id: string;
  label: string;
  projectId?: string;
  date: string;
  amount: number;
}

export async function getMoneyOverview(user: User, allSales: Sale[], projectId?: string) {
  const scope = getVisibleProjectIds(user);
  function visible(id?: string) {
    return (!projectId || id === projectId) && (scope === "all" || (!!id && scope.includes(id)));
  }

  const [allBudgets, allExpenses, allContractorPayments, allPurchases, adjustments, allPayments, contributionPayments,
    contributions, contributionReport, installments, goalInstallments, obligations] = await Promise.all([
    projectBudgetRepository.list(), projectExpenseRepository.list(), contractorPaymentRepository.list(),
    purchaseRepository.list(), financialAdjustmentRepository.list(), customerPaymentRepository.list(),
    contributionPaymentRepository.list(), ownerContributionRepository.list(), getOwnerContributionsReport(user, projectId),
    installmentRepository.list(), goalInstallmentRepository.list(), ownerInstallmentObligationRepository.list(),
  ]);
  const budgets = allBudgets.filter((row) => visible(row.projectId));
  const expenses = allExpenses.filter((row) => visible(row.projectId) && countsTowardActualCost(row.status));
  const contractors = allContractorPayments.filter((row) => visible(row.projectId) && countsTowardActualCost(row.status));
  const purchases = allPurchases.filter((row) => visible(row.projectId) && row.status !== "cancelled");
  const changes = indexCostAdjustments(adjustments.filter((item) => visible(item.projectId)));
  const netExpense = (row: typeof expenses[number]) => row.amount.amount + (changes.get(`expense:${row.id}`) ?? 0);
  const netContractor = (row: typeof contractors[number]) => row.amount.amount + (changes.get(`contractorPayment:${row.id}`) ?? 0);
  const amount = (rows: OverviewRow[]) => rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;

  const costs = [
    ...expenses.map((row) => ({ id: row.id, label: row.description, projectId: row.projectId, date: row.date, amount: netExpense(row) })),
    ...contractors.map((row) => ({ id: row.id, label: "Contractor payment", projectId: row.projectId, date: row.date, amount: netContractor(row) })),
    ...purchases.map((row) => ({ id: row.id, label: "Materials purchase", projectId: row.projectId, date: row.purchaseDate ?? row.createdAt, amount: row.total.amount })),
  ];
  const categories = new Map<string, number>();
  const addCategory = (label: string, value: number) => categories.set(label, (categories.get(label) ?? 0) + value);
  for (const row of expenses) addCategory(row.category, netExpense(row));
  for (const row of contractors) addCategory("Contractor payments", netContractor(row));
  for (const row of purchases) addCategory("Materials purchases", row.total.amount);

  const salesById = new Map(allSales.map((sale) => [sale.id, sale]));
  const salesByCustomer = new Map<string, Sale[]>();
  for (const sale of allSales) {
    const customerSales = salesByCustomer.get(sale.customerId) ?? [];
    customerSales.push(sale);
    salesByCustomer.set(sale.customerId, customerSales);
  }
  const visibleSales = allSales.filter((sale) => visible(sale.projectId) && sale.status !== "cancelled");
  const projectByContribution = new Map(contributions.map((row) => [row.id, row.projectId]));
  const receipts = [
    ...allPayments.flatMap((row) => {
      const id = (row.saleId && salesById.get(row.saleId)?.projectId) || row.projectId;
      return visible(id) ? [{ id: row.id, label: row.category || "Client payment", projectId: id, date: row.date, amount: row.amount.amount }] : [];
    }),
    ...contributionPayments.flatMap((row) => {
      const id = projectByContribution.get(row.contributionId);
      return id && visible(id) ? [{ id: row.id, label: "Owner contribution", projectId: id, date: row.date, amount: row.amount.amount }] : [];
    }),
  ];

  let saleOutstanding = 0;
  const due: OverviewRow[] = [];
  for (const sale of visibleSales) {
    const summary = summarizeSale(sale, salesByCustomer.get(sale.customerId) ?? [], allPayments);
    saleOutstanding += summary.remaining;
    const rows = installments.filter((item) => item.saleId === sale.id).map((row) => ({ ...row, amount: row.amount.amount }));
    const status = allocateInstallments(rows, summary.paid);
    for (const row of rows) {
      const remaining = status.get(row.id)?.remaining ?? 0;
      if (remaining > 0) due.push({ id: row.id, label: `Flat sale installment ${row.installmentNumber}`, projectId: sale.projectId, date: row.dueDate, amount: remaining });
    }
  }
  const goalById = new Map(goalInstallments.map((item) => [item.id, item]));
  const obligationsByContribution = new Map<string, typeof obligations>();
  for (const row of obligations.filter((item) => visible(item.projectId))) {
    const list = obligationsByContribution.get(row.contributionId) ?? [];
    list.push(row);
    obligationsByContribution.set(row.contributionId, list);
  }
  const paidByObligation = new Map<string, number>();
  for (const row of contributionPayments) {
    if (!row.installmentObligationId) continue;
    paidByObligation.set(row.installmentObligationId, (paidByObligation.get(row.installmentObligationId) ?? 0) + row.amount.amount);
  }
  for (const row of contributionReport.outstandingRows) {
    const { contribution, allocation, outstanding } = row;
    const plan = obligationsByContribution.get(contribution.id) ?? [];
    if (!plan.length) {
      due.push({ id: contribution.id, label: allocation.title, projectId: allocation.projectId, date: contribution.dueDate, amount: outstanding });
      continue;
    }
    let scheduled = 0;
    for (const item of plan) {
      const installment = goalById.get(item.goalInstallmentId);
      if (!installment) continue;
      const balance = Math.max(0, item.payableAmount.amount - (paidByObligation.get(item.id) ?? 0));
      scheduled += balance;
      if (balance > 0) due.push({ id: item.id, label: installment.label, projectId: item.projectId, date: installment.dueDate, amount: balance });
    }
    const unscheduled = (Math.round(outstanding * 100) - Math.round(scheduled * 100)) / 100;
    if (unscheduled > 0) due.push({ id: contribution.id, label: `${allocation.title} · unscheduled balance`, projectId: allocation.projectId, date: contribution.dueDate, amount: unscheduled });
  }
  const spent = amount(costs);
  const budget = budgets.reduce((sum, row) => sum + row.budgeted.amount, 0);
  const recent = [
    ...costs.map((row) => ({ ...row, direction: "cost" as const })),
    ...receipts.map((row) => ({ ...row, direction: "received" as const })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
  const now = new Date();
  const today = dateKey.format(now);
  const cutoff = dateKey.format(new Date(now.getTime() + 30 * 86_400_000));
  const dueSoon = due.filter((row) => row.date.slice(0, 10) <= cutoff).sort((a, b) => a.date.localeCompare(b.date));

  return {
    budget: budgets.length ? budget : null,
    spent,
    received: amount(receipts),
    outstanding: saleOutstanding + contributionReport.totalOutstanding,
    supplierPayable: purchases.filter((row) => row.paymentStatus === "unpaid").reduce((sum, row) => sum + row.total.amount, 0),
    partialPurchases: purchases.filter((row) => row.paymentStatus === "partially-paid").length,
    categories: [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    recent,
    dueSoon: dueSoon.slice(0, 8),
    overdueCount: dueSoon.filter((row) => row.date.slice(0, 10) < today).length,
    today,
  };
}
