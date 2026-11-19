import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ConstructionAdminExplorer } from "@/components/admin/construction/ConstructionAdminExplorer";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { projectRepository } from "@/features/projects/repository";
import { contractorRepository } from "@/features/contractors/repository";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Admin Step 8 — Construction Management Foundation. Reads
 * `constructionPhaseRepository` (the internal `types/construction.ts`
 * shape) joined against `projectRepository`. Full create/edit/delete for
 * phases; tasks are managed from within a phase's own detail page.
 */
export default async function AdminConstructionPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Construction." />
      </div>
    );
  }

  let phases, projects, contractors;
  try {
    const [allPhases, allProjects, allContractors] = await Promise.all([
      constructionPhaseRepository.list(),
      projectRepository.list(),
      contractorRepository.list(),
    ]);
    phases = filterToVisibleProjects(user, allPhases);
    projects = filterVisibleProjectsList(user, allProjects);
    contractors = allContractors;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Construction phases couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "construction.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Construction"}</AdminText>}
        description={<AdminText>{"Every phase of work across your projects, from land to handover."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/construction/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Phase"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ConstructionAdminExplorer
          phases={phases}
          projects={projects}
          contractors={contractors}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
