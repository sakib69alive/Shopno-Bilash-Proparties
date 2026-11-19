import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ProjectsAdminExplorer } from "@/components/admin/projects/ProjectsAdminExplorer";
import { projectRepository } from "@/features/projects/repository";
import { getProjectWorkspaceStats, type ProjectWorkspaceStats } from "@/features/projects/workspaceStats";
import { filterVisibleProjectsList } from "@/lib/projectScope";

/**
 * Admin Step 5 — Project Management Foundation. Reads `projectRepository`
 * (the internal `types/project.ts` shape from Admin Step 1), not
 * `content/projects.ts`'s public demo data — those are two deliberately
 * separate models today (see ARCHITECTURE.md). Full create/edit/delete —
 * this is the root record everything else (Units, Construction, Sales,
 * Expenses) hangs off of via `projectId`.
 */
export default async function AdminProjectsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Projects." />
      </div>
    );
  }

  let projects, stats;
  try {
    projects = filterVisibleProjectsList(user, await projectRepository.list());
    const statsEntries = await Promise.all(
      projects.map(async (p): Promise<[string, ProjectWorkspaceStats]> => [p.id, await getProjectWorkspaceStats(p.id)]),
    );
    stats = Object.fromEntries(statsEntries);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Projects couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canCreate = hasPermission(user.role, "project.create");
  const canDelete = hasPermission(user.role, "project.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Projects"}</AdminText>}
        description={<AdminText>{"Every development your team is planning, building or has delivered."}</AdminText>}
        primaryAction={
          canCreate && (
            <Link href="/admin/projects/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Project"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ProjectsAdminExplorer projects={projects} stats={stats} canCreate={canCreate} canDelete={canDelete} />
      </div>
    </>
  );
}
