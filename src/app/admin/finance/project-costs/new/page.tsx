import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectBudgetForm } from "@/components/admin/finance/ProjectBudgetForm";
import { createProjectBudget } from "@/features/finance/projectBudgetActions";
import { projectRepository } from "@/features/projects/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";

export default async function NewProjectBudgetPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record a budget line." />
      </div>
    );
  }

  const [projects, phases] = await Promise.all([projectRepository.list(), constructionPhaseRepository.list()]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Add Budget Line"}</AdminText>} breadcrumbs={[{ label: "Project Finance", href: "/admin/finance/project-costs" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ProjectBudgetForm action={createProjectBudget} projects={projects} phases={phases} submitLabel="Add Budget Line" />
      </div>
    </>
  );
}
