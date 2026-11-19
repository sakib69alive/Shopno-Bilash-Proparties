import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExpenseForm } from "@/components/admin/finance/ExpenseForm";
import { updateExpense } from "@/features/finance/expenseActions";
import { projectExpenseRepository, cashAccountRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { vendorRepository } from "@/features/procurement/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { contractorRepository } from "@/features/contractors/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this expense." />
      </div>
    );
  }

  const [expense, projects, vendors, phases, buildings, contractors, accounts] = await Promise.all([
    projectExpenseRepository.findById(id),
    projectRepository.list(),
    vendorRepository.list(),
    constructionPhaseRepository.list(),
    buildingRepository.list(),
    contractorRepository.list(),
    cashAccountRepository.list(),
  ]);
  if (!expense) notFound();

  const boundAction = updateExpense.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Expense"}</AdminText>}
        breadcrumbs={[
          { label: "Expenses", href: "/admin/finance/expenses" },
          { label: expense.description, href: `/admin/finance/expenses/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ExpenseForm
          action={boundAction}
          expense={expense}
          projects={projects}
          vendors={vendors}
          phases={phases}
          buildings={buildings}
          contractors={contractors}
          accounts={accounts}
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
