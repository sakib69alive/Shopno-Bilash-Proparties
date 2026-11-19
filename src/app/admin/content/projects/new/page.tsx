import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectContentForm } from "@/components/admin/projectContent/ProjectContentForm";
import { createProjectContent } from "@/features/projectContent/actions";

export default async function NewProjectContentPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create Projects content." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Project"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Projects", href: "/admin/content/projects" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ProjectContentForm action={createProjectContent} submitLabel="Publish Project" />
      </div>
    </>
  );
}
