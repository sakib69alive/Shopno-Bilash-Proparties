import { notFound } from "next/navigation";
import Link from "next/link";
import { Receipt, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatBDT, formatDate } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import { projectExpenseRepository } from "@/features/finance/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Expenses tab — a read-focused, project-scoped view. Full CRUD lives on the global Expenses page, reached here pre-filtered. */
export default async function ProjectExpensesPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Expenses." />
      </div>
    );
  }

  let project, expenses;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      expenses = (await projectExpenseRepository.list()).filter((e) => e.projectId === id).sort((a, b) => b.date.localeCompare(a.date));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Expenses couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !expenses) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">
          {expenses.length} expense(s) recorded for this project — {formatBDT(total)} total.
        </p>
        <Link
          href={`/admin/finance/expenses?projectId=${project.id}`}
          className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          Manage all expenses <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses recorded yet"
          description="Costs recorded against this project will appear here."
          action={
            <Link href="/admin/finance/expenses/new" className="text-body-sm text-accent font-medium hover:underline">
              Record Expense
            </Link>
          }
        />
      ) : (
        <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border text-label text-fg-subtle border-b uppercase">
                <th className="px-4 py-3 font-normal">Description</th>
                <th className="px-4 py-3 font-normal">Category</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-border text-body-sm border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/finance/expenses/${expense.id}`} className="text-fg hover:text-accent transition-colors">
                      {expense.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{expense.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(expense.amount.amount)}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatDate(new Date(expense.date))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
