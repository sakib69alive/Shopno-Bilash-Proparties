import "server-only";
import { financePage, type FinanceAssistantContext, type FinanceSelection } from "@/lib/financeAssistant";
import { canAccessProject, getVisibleProjectIds } from "@/lib/projectScope";
import { hasPermission } from "@/lib/permissions";
import { formatBDT } from "@/lib/format";
import { getMoneyOverview } from "@/features/finance/moneyOverview";
import { projectRepository } from "@/features/projects/repository";
import { installmentRepository, saleRepository } from "@/features/sales/repository";
import { cashAccountRepository, customerPaymentRepository, financialAdjustmentRepository, projectBudgetRepository, projectExpenseRepository } from "@/features/finance/repository";
import { contractorPaymentRepository } from "@/features/contractors/repository";
import { costAllocationRepository, contributionAdjustmentRepository, contributionPaymentRepository, goalInstallmentRepository, ownerContributionRepository, ownerInstallmentObligationRepository } from "@/features/costAllocations/repository";
import { computeGoalCollectionStats } from "@/features/costAllocations/goalStats";
import { getExpenseCategoryReport, getMonthlyCashFlow } from "@/features/reports/financeReports";
import { getOwnerContributionsReport } from "@/features/reports/ownerContributions";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { calculateFinanceDraft } from "@/lib/financeCalculation";
import { getFinanceCalculation } from "@/features/finance/calculations";
import { countsTowardActualCost } from "@/lib/transactionStatus";
import { computeContributionState } from "@/lib/contributionStatus";
import { allocateInstallments, INSTALLMENT_STATUS_LABEL, type InstallmentShare } from "@/lib/installmentStatus";
import { summarizeSale } from "@/lib/salePayments";
import type { User } from "@/types/user";

const money = (label: string, amount: number | null, basis?: string) => ({ label, value: amount === null ? "Unavailable" : formatBDT(amount, 2), basis });
const fact = (label: string, value: string | number, basis?: string) => ({ label, value: String(value), basis });
const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + Math.round(value(row) * 100), 0) / 100;
const noRecord = (title: string): FinanceAssistantContext => ({ title, facts: [], notes: ["This record is unavailable for the current selection."] });
const scopeAllows = (user: User, id?: string) => id ? canAccessProject(user, id) : getVisibleProjectIds(user) === "all";

export async function getFinanceAssistantContext(user: User, path: string, requestedProject?: string, selected?: FinanceSelection, draft?: string): Promise<FinanceAssistantContext | null> {
  const page = financePage(path);
  if (!page || !hasPermission(user.role, "finance.view")) return null;
  if (page.tab === "report" && !hasPermission(user.role, "reports.view")) return null;
  if (page.tab === "installment" && !hasPermission(user.role, "sales.view")) return null;
  const projectId = ("projectId" in page ? page.projectId : undefined) ?? requestedProject;
  if (projectId && !canAccessProject(user, projectId)) return null;
  const visible = (id?: string) => scopeAllows(user, id) && (!projectId || projectId === id);
  const id = "id" in page ? page.id : undefined;
  const row = (kind: FinanceSelection["kind"]) => id ?? (selected?.kind === kind ? selected.id : undefined);
  const projectName = projectId ? (await projectRepository.findById(projectId))?.name : undefined;
  if (projectId && !projectName) return null;
  const canManage = hasPermission(user.role, "finance.manage");

  if (page.tab === "calculation") {
    const saved = draft ? await getFinanceCalculation(user.id, draft) : null;
    if (draft && !saved) return noRecord("Saved calculation");
    const result = saved && calculateFinanceDraft(saved.data);
    return {
      title: saved?.data.name ?? "Calculation workspace",
      facts: result ? [money("Saved total", result.total), ...result.lines.map((value, i) => money(saved.data.lines[i].description || `Item ${i + 1}`, value))] : [],
      notes: ["Only the saved draft is included. Submitting the expense form is required to post an expense."],
      links: result && result.total > 0 && canManage ? [{ label: "Review as expense", href: `/admin/finance/expenses/new?calculation=${encodeURIComponent(saved.id)}` }] : undefined,
    };
  }

  if (page.tab === "goal" && row("goal")) {
    const goal = await costAllocationRepository.findById(row("goal")!);
    if (!goal || !visible(goal.projectId)) return noRecord("Project goal");
    const [allMembers, allAdjustments, obligations, installments, payments, overview] = await Promise.all([
      ownerContributionRepository.list(), contributionAdjustmentRepository.list(), ownerInstallmentObligationRepository.list(),
      goalInstallmentRepository.list(), contributionPaymentRepository.list(),
      saleRepository.list().then((sales) => getMoneyOverview(user, sales, goal.projectId)),
    ]);
    const members = allMembers.filter((member) => member.projectId === goal.projectId && member.costAllocationId === goal.id);
    const member = selected?.kind === "member" ? members.find((item) => item.id === selected.id) : undefined;
    if (selected?.kind === "member" && !member) return noRecord("Selected member");
    const memberIds = new Set(members.map((entry) => entry.id));
    const adjustments = allAdjustments.filter((entry) => entry.projectId === goal.projectId && memberIds.has(entry.contributionId));
    const scopeIds = member ? new Set([member.id]) : memberIds;
    const schedule = new Map(installments.filter((item) => item.projectId === goal.projectId && item.costAllocationId === goal.id).map((item) => [item.id, item]));
    const charges = obligations.filter((item) => scopeIds.has(item.contributionId) && schedule.has(item.goalInstallmentId) && item.projectId === goal.projectId);
    const recognized = charges.map((item) => {
      const applied = sum(payments.filter((payment) => payment.contributionId === item.contributionId && payment.installmentObligationId === item.id), (payment) => payment.amount.amount);
      return { due: schedule.get(item.goalInstallmentId)!.dueDate, label: schedule.get(item.goalInstallmentId)!.label, amount: item.payableAmount.amount, applied, remaining: Math.max(0, item.payableAmount.amount - applied) };
    });
    const next = recognized.filter((item) => item.remaining > 0).sort((a, b) => a.due.localeCompare(b.due))[0];
    const stats = computeGoalCollectionStats(goal, members, adjustments);
    const balance = member && computeContributionState(member, goal, adjustments.filter((item) => item.contributionId === member.id));
    const dueDate = member && balance && balance.outstanding > 0 ? next?.due ?? member.dueDate : next?.due;
    return {
      title: member ? (await resolveDocumentOwner(member.ownerType, member.ownerId)).label : goal.title,
      projectName: (await projectRepository.findById(goal.projectId))?.name,
      facts: [
        ...(!member ? [money("Collection target", stats.target, "Amount saved on this project goal.")] : []),
        money("Contribution payable", balance ? balance.effectivePayable : stats.allocated, "Original contribution plus recorded adjustments."),
        money("Paid toward contributions", member ? member.paidAmount.amount : stats.collected),
        money("Outstanding before fines", balance ? balance.outstanding : stats.outstanding, "Adjusted payable minus recorded payments, with a minimum of zero per member."),
        money("Scheduled installments", sum(recognized, (item) => item.amount)),
        money("Paid on scheduled installments", sum(recognized, (item) => item.applied), "Only payments applied to an installment are included."),
        money("Unpaid scheduled installments", sum(recognized, (item) => item.remaining)),
        ...(member ? [fact("Contribution ratio", `${(member.shareRatio * 100).toFixed(2)}%`), money("Suggested unscheduled collection", Math.max(0, (balance?.outstanding ?? 0) - sum(recognized, (item) => item.remaining)), "Outstanding contribution less unpaid scheduled amounts, floored at zero.")] : []),
        ...(dueDate ? [fact("Next unpaid due date", dueDate, next?.label ?? "Contribution due date.")] : []),
      ],
      availableBudget: overview.budget === null ? undefined : overview.budget - overview.spent,
      contributionRatio: member && Number.isFinite(member.shareRatio) && member.shareRatio >= 0 && member.shareRatio <= 1 ? member.shareRatio : undefined,
      notes: goal.status === "generated" ? undefined : ["This goal has no active collection plan."],
      links: canManage ? [{ label: "Review installment plan", href: `/admin/finance/cost-allocations/${encodeURIComponent(goal.id)}#installment-plan` }] : undefined,
    };
  }

  if (page.tab === "installment") {
    const [sales, installments, payments] = await Promise.all([saleRepository.list(), installmentRepository.list(), customerPaymentRepository.list()]);
    const target = row("installment");
    const salesById = new Map(sales.filter((sale) => visible(sale.projectId) && sale.status !== "cancelled").map((sale) => [sale.id, sale]));
    const items = installments.filter((item) => item.saleId ? salesById.has(item.saleId) : visible());
    const item = target ? items.find((entry) => entry.id === target) : undefined;
    if (target && !item) return noRecord("Selected sale installment");
    const shares = new Map<string, InstallmentShare>();
    for (const sale of salesById.values()) {
      const related = items.filter((entry) => entry.saleId === sale.id).map((entry) => ({ ...entry, amount: entry.amount.amount }));
      if (!related.length) continue;
      const summary = summarizeSale(sale, sales.filter((entry) => entry.customerId === sale.customerId), payments);
      for (const [key, share] of allocateInstallments(related, summary.paid)) shares.set(key, share);
    }
    const selectedItems = item ? [item] : items;
    const known = selectedItems.filter((entry) => shares.has(entry.id));
    const unknown = selectedItems.length - known.length;
    const status = item ? shares.get(item.id)?.status : undefined;
    return {
      title: item ? `Sale installment #${item.installmentNumber}` : "Sale installments",
      projectName,
      facts: [money("Scheduled amount", sum(selectedItems, (entry) => entry.amount.amount)),
        money("Covered on linked sales", known.length ? sum(known, (entry) => shares.get(entry.id)!.paidAmount) : null),
        money("Outstanding on linked sales", known.length ? sum(known, (entry) => shares.get(entry.id)!.remaining) : null),
        ...(item ? [fact("Due date", item.dueDate), fact("Status", status ? INSTALLMENT_STATUS_LABEL[status] : item.status)] : [fact("Visible installments", items.length)])],
      notes: unknown ? [`${unknown} installment(s) have no sale link. Their payment coverage is unavailable.`] : ["Coverage follows each linked sale’s payment allocation and recorded paid markers."],
    };
  }

  if (page.tab === "expense" || page.tab === "account") {
    const [allExpenses, adjustments, contractorPayments, accounts] = await Promise.all([
      projectExpenseRepository.list(), financialAdjustmentRepository.list(), contractorPaymentRepository.list(), cashAccountRepository.list(),
    ]);
    const expenseId = page.tab === "expense" ? row("expense") : undefined;
    const accountId = page.tab === "account" ? row("account") : undefined;
    const expenses = allExpenses.filter((item) => visible(item.projectId) && (!expenseId || expenseId === item.id) &&
      (page.tab !== "account" || (!!item.accountId && (!accountId || accountId === item.accountId))));
    if (expenseId && !expenses.length) return noRecord("Selected expense");
    const account = accountId && accounts.find((item) => item.id === accountId);
    if (accountId && !account) return noRecord("Selected account");
    const recognized = expenses.filter((item) => countsTowardActualCost(item.status));
    const targets = new Map(recognized.map((item) => [item.id, item.projectId]));
    const netAdjustments = sum(adjustments.filter((item) => item.targetType === "expense" && targets.get(item.targetId) === item.projectId), (item) => item.amount.amount);
    const expense = expenseId ? expenses[0] : undefined;
    return {
      title: expense?.description ?? (account ? account.name : page.tab === "account" ? "Cash and bank accounts" : "Project expenses"),
      projectName,
      facts: [
        fact("Expense records", expenses.length),
        money("Recorded expense amounts", sum(expenses, (item) => item.amount.amount)),
        money("Recognized adjustments", netAdjustments),
        money("Recognized project cost", sum(recognized, (item) => item.amount.amount) + netAdjustments, "Posted expense amounts plus their adjustments."),
        ...(expense ? [fact("Status", expense.status ?? "Recorded"), fact("Category", expense.category), fact("Date", expense.date)] : []),
        ...(page.tab === "account" ? [
          fact("Account records", account ? 1 : accounts.length),
          money("Tagged contractor payments", sum(contractorPayments.filter((item) => visible(item.projectId) && countsTowardActualCost(item.status) && !!item.accountId && (!accountId || item.accountId === accountId)), (item) => item.amount.amount)),
          money("Reconciled cash balance", null),
        ] : []),
      ],
      notes: page.tab === "account" ? ["Account tags describe where recorded costs were paid. Opening balances and bank reconciliation are not stored."] : undefined,
      links: canManage && !expense ? [{ label: "Review a new expense", href: "/admin/finance/expenses/new" }] : undefined,
    };
  }

  if (page.tab === "payment") {
    const [payments, sales] = await Promise.all([customerPaymentRepository.list(), saleRepository.list()]);
    const saleProject = new Map(sales.map((sale) => [sale.id, sale.projectId]));
    const target = row("payment");
    const rows = payments.filter((item) => visible((item.saleId && saleProject.get(item.saleId)) || item.projectId) && (!target || item.id === target));
    if (target && !rows.length) return noRecord("Selected receipt");
    return { title: target ? "Selected receipt" : "Customer receipts", projectName, facts: [
      money("Recorded receipts", sum(rows, (item) => item.amount.amount)), fact("Receipt entries", rows.length),
      ...(target ? [fact("Received on", rows[0].date), fact("Category", rows[0].category)] : []),
    ], links: canManage ? [{ label: "Open payment form", href: "/admin/sales/payments/new" }] : undefined };
  }

  if (page.tab === "report" && id === "cash-flow") {
    const rows = await getMonthlyCashFlow(user, projectId);
    return { title: "Monthly cash flow", projectName, facts: rows.map((row) => money(row.month, row.net, `Received ${formatBDT(row.received, 2)} minus posted expenses and contractor payments ${formatBDT(row.spent, 2)}.`)),
      notes: ["This report compares recorded flows. It does not establish bank balances or measure profit."] };
  }
  if (page.tab === "report" && id === "categories") {
    const rows = await getExpenseCategoryReport(user, projectId);
    return { title: "Expense categories", projectName, facts: rows.map((item) => money(item.category, item.total, `${item.count} recorded expense(s). Costs include posted entries and adjustments.`)) };
  }
  if (page.tab === "report" && id === "owner-contributions") {
    const report = await getOwnerContributionsReport(user, projectId);
    return { title: "Owner contributions", projectName, facts: [money("Payable", report.totalPayable), money("Paid", report.totalPaid), money("Outstanding before fines", report.totalOutstanding), money("Fines", report.totalFines), fact("Overdue contributions", report.overdueCount)] };
  }
  if (page.tab === "report" && id === "contractor-payments") {
    const rows = (await contractorPaymentRepository.list()).filter((item) => visible(item.projectId));
    return { title: "Contractor payments", projectName, facts: [fact("Payment entries", rows.length), money("Posted payments", sum(rows.filter((item) => countsTowardActualCost(item.status)), (item) => item.amount.amount))] };
  }

  const budgetId = page.tab === "budget" ? row("budget") : undefined;
  const budget = budgetId ? await projectBudgetRepository.findById(budgetId) : null;
  if (budgetId && (!budget || !visible(budget.projectId))) return noRecord("Selected budget line");
  const scope = budget?.projectId ?? projectId;
  const [overview, budgets] = await Promise.all([saleRepository.list().then((sales) => getMoneyOverview(user, sales, scope)), projectBudgetRepository.list()]);
  const availableBudget = overview.budget === null ? undefined : overview.budget - overview.spent;
  return {
    title: page.tab === "goal" ? "Project collections" : page.tab === "budget" ? "Project budget" : page.tab === "report" ? "Finance reports" : "Finance overview",
    projectName: budget ? (await projectRepository.findById(budget.projectId))?.name : projectName,
    facts: [
      ...(budget ? [money(`Budget line: ${budget.category}`, budget.budgeted.amount)] : []),
      money("Planned budget", overview.budget), money("Recognized project costs", overview.spent),
      money("Budget remaining", availableBudget ?? null, "Planned budget minus recognized project costs."),
      money("Recorded receipts", overview.received), money("Outstanding", overview.outstanding),
      ...(page.tab === "budget" ? budgets.filter((item) => visible(item.projectId) && (!scope || item.projectId === scope))
        .slice(0, 20).map((item) => money(`Budgeted: ${item.category}`, item.budgeted.amount)) : []),
    ],
    availableBudget,
    notes: [...(availableBudget === undefined ? ["No saved budget is available for this scope."] : []),
      ...(availableBudget !== undefined && availableBudget < 0 ? [`Recognized costs exceed budget by ${formatBDT(-availableBudget, 2)}.`] : []),
      ...(overview.overdueCount ? [`${overview.overdueCount} collection schedule entries are overdue.`] : [])],
    links: [{ label: "Open calculation workspace", href: "/admin/finance/calculations" }],
  };
}
