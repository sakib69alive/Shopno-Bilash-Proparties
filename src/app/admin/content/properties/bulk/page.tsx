import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkUnitForm } from "@/components/admin/unitContent/BulkUnitForm";
import { projectContentRepository } from "@/features/projectContent/repository";

export default async function BulkAddUnitsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create Properties content." />
      </div>
    );
  }

  const [{ project }, projects] = await Promise.all([searchParams, projectContentRepository.list()]);

  return (
    <>
      <AdminPageHeader
        title="Add units in bulk"
        description="Create many units for a project at once, then fine-tune any of them."
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Properties", href: "/admin/content/properties" },
          { label: "Bulk add" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <BulkUnitForm projects={projects} initialProject={project} />
      </div>
    </>
  );
}
