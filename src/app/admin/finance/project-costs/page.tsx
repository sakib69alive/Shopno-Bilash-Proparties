import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ProjectFinanceExplorer } from "@/components/admin/finance/ProjectFinanceExplorer";
import { projectBudgetRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Reads `projectBudgetRepository` (the internal `types/finance/project.ts`
 * `ProjectBudget` shape) joined against the same `projectRepository` every
 * other admin module reads. Gated on `finance.view`; create/edit/delete
 * gated on `finance.manage`, matching Payments/Expenses.
 */
export default async function AdminProjectFinancePage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Project Finance." />
      </div>
    );
  }

  let budgets, projects;
  try {
    const [allBudgets, allProjects] = await Promise.all([projectBudgetRepository.list(), projectRepository.list()]);
    budgets = filterToVisibleProjects(user, allBudgets);
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Project Finance couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Project Finance"}</AdminText>}
        description={<AdminText>{"Budgeted vs. actual cost, by category, for each project."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/finance/project-costs/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Budget Line"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ProjectFinanceExplorer
          budgets={budgets}
          projects={projects}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
