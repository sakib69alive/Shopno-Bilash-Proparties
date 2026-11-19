import { AdminText } from "@/components/admin/AdminLanguage";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteProjectButton } from "@/components/admin/projects/DeleteProjectButton";
import { ProjectWorkspaceTabs } from "@/components/admin/projects/ProjectWorkspaceTabs";
import { ProjectSwitcher } from "@/components/admin/projects/ProjectSwitcher";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterVisibleProjectsList } from "@/lib/projectScope";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

/**
 * The Project Workspace shell — header, breadcrumb, tab strip, and project
 * switcher, shared by every `[id]/*` page. Each child page still re-fetches
 * `project` and re-runs its own permission + `canAccessProject` check
 * (same as `[id]/page.tsx` and `[id]/edit/page.tsx` already did before this
 * layout existed) rather than trusting this layout's check — this codebase
 * has no established pattern for a layout handing verified data down to
 * its pages, and introducing one in the same pass as this codebase's first
 * nested layout is two new things at once. The extra lookup is one cheap
 * JSON-blob read per page.
 */
export default async function ProjectWorkspaceLayout({ children, params }: LayoutProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this project." />
      </div>
    );
  }

  let project, allProjects;
  try {
    [project, allProjects] = await Promise.all([projectRepository.findById(id), projectRepository.list()]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This project couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const visibleProjects = filterVisibleProjectsList(user, allProjects);
  const canUpdate = hasPermission(user.role, "project.update");
  const canDelete = hasPermission(user.role, "project.delete");

  return (
    <>
      <AdminPageHeader
        title={project.name}
        breadcrumbs={[{ label: "Projects", href: "/admin/projects" }, { label: project.name }]}
        secondaryActions={
          <div className="flex items-center gap-2.5">
            <StatusBadge status={project.status} />
            <ProjectSwitcher projects={visibleProjects} currentId={project.id} />
            {canUpdate && (
              <Link href={`/admin/projects/${project.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
            {canDelete && <DeleteProjectButton id={project.id} name={project.name} />}
          </div>
        }
      >
        <ProjectWorkspaceTabs projectId={project.id} role={user.role} />
      </AdminPageHeader>
      {children}
    </>
  );
}
