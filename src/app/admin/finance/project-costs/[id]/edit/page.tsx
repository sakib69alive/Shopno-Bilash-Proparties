import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectBudgetForm } from "@/components/admin/finance/ProjectBudgetForm";
import { updateProjectBudget } from "@/features/finance/projectBudgetActions";
import { projectBudgetRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectBudgetPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this budget line." />
      </div>
    );
  }

  const [budget, projects, phases] = await Promise.all([
    projectBudgetRepository.findById(id),
    projectRepository.list(),
    constructionPhaseRepository.list(),
  ]);
  if (!budget) notFound();

  const boundAction = updateProjectBudget.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Budget Line"}</AdminText>}
        breadcrumbs={[
          { label: "Project Finance", href: "/admin/finance/project-costs" },
          { label: budget.category, href: `/admin/finance/project-costs/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ProjectBudgetForm action={boundAction} budget={budget} projects={projects} phases={phases} submitLabel="Save Changes" />
      </div>
    </>
  );
}
