import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitContentForm } from "@/components/admin/unitContent/UnitContentForm";
import { updateUnitContent } from "@/features/unitContent/actions";
import { unitContentRepository } from "@/features/unitContent/repository";
import { projectContentRepository } from "@/features/projectContent/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUnitContentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Properties content." />
      </div>
    );
  }

  const [unit, projects] = await Promise.all([unitContentRepository.findById(id), projectContentRepository.list()]);
  if (!unit) notFound();

  const boundAction = updateUnitContent.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={unit.name}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Properties", href: "/admin/content/properties" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <UnitContentForm action={boundAction} unit={unit} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
