import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { createProject } from "@/features/projects/actions";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a project." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Project"}</AdminText>}
        breadcrumbs={[{ label: "Projects", href: "/admin/projects" }, { label: "New", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <ProjectForm action={createProject} submitLabel="Create Project" />
      </div>
    </>
  );
}
