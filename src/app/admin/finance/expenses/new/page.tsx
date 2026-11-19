import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpenseForm } from "@/components/admin/finance/ExpenseForm";
import { createExpense, createExpenseFromCalculation } from "@/features/finance/expenseActions";
import { projectRepository } from "@/features/projects/repository";
import { vendorRepository } from "@/features/procurement/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { contractorRepository } from "@/features/contractors/repository";
import { cashAccountRepository } from "@/features/finance/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";
import { getFinanceCalculation } from "@/features/finance/calculations";
import { calculateFinanceDraft } from "@/lib/financeCalculation";
import { notFound } from "next/navigation";

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ calculation?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record an expense." />
      </div>
    );
  }

  const { calculation } = await searchParams;
  const [projects, vendors, phases, buildings, contractors, accounts, draft] = await Promise.all([
    projectRepository.list(),
    vendorRepository.list(),
    constructionPhaseRepository.list(),
    buildingRepository.list(),
    contractorRepository.list(),
    cashAccountRepository.list(),
    calculation ? getFinanceCalculation(user.id, calculation) : null,
  ]);
  const amount = draft && calculateFinanceDraft(draft.data)?.total;
  if (calculation && (!draft || !amount)) notFound();

  return (
    <>
      <AdminPageHeader title={draft ? "Review project expense" : "Record Expense"}
        description={draft ? "Choose the project and fill in the expense details. Confirm the expense only when you are ready to record it." : undefined}
        breadcrumbs={[{ label: "Expenses", href: "/admin/finance/expenses" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ExpenseForm
          action={draft ? createExpenseFromCalculation.bind(null, draft.id, draft.revision) : createExpense}
          projects={filterVisibleProjectsList(user, projects)}
          vendors={vendors}
          phases={phases}
          buildings={buildings}
          contractors={contractors}
          accounts={accounts}
          calculation={draft && amount ? { description: draft.data.name, amount } : undefined}
          submitLabel={draft ? "Confirm and record expense" : "Record Expense"}
        />
      </div>
    </>
  );
}
