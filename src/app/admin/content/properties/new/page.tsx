import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitContentForm } from "@/components/admin/unitContent/UnitContentForm";
import { createUnitContent } from "@/features/unitContent/actions";
import { projectContentRepository } from "@/features/projectContent/repository";

export default async function NewUnitContentPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create Properties content." />
      </div>
    );
  }

  const projects = await projectContentRepository.list();

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Property"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Properties", href: "/admin/content/properties" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <UnitContentForm action={createUnitContent} projects={projects} submitLabel="Publish Property" />
      </div>
    </>
  );
}
