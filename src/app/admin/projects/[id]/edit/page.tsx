import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { updateProject } from "@/features/projects/actions";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Reached both via the workspace header's "Edit" button and via the Settings tab (which redirects here) — the workspace layout already renders the title/breadcrumb/tabs, so this page is just the form. */
export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this project." />
      </div>
    );
  }

  const project = await projectRepository.findById(id);
  if (!project) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const boundAction = updateProject.bind(null, id);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-h3 mb-5"><AdminText>{"Edit Project"}</AdminText></h1>
      <ProjectForm action={boundAction} project={project} submitLabel="Save Changes" />
    </div>
  );
}
