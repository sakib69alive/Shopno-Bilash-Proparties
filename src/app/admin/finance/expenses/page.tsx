import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ExpensesAdminExplorer } from "@/components/admin/finance/ExpensesAdminExplorer";
import { projectExpenseRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Admin Step 13 — Expenses Foundation. Reads `projectExpenseRepository`
 * (the internal `types/finance/project.ts` `ProjectExpense` shape) joined
 * against `projectRepository`. Full create/edit/delete, gated on
 * `finance.manage`.
 */
export default async function AdminExpensesPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Expenses." />
      </div>
    );
  }

  let expenses, projects;
  try {
    const [allExpenses, allProjects] = await Promise.all([projectExpenseRepository.list(), projectRepository.list()]);
    expenses = filterToVisibleProjects(user, allExpenses);
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Expenses couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Expenses"}</AdminText>}
        description={<AdminText>{"Every cost recorded against a project."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/finance/expenses/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Expense"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ExpensesAdminExplorer
          expenses={expenses}
          projects={projects}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
