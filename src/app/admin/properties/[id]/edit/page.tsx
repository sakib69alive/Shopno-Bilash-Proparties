import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/properties/UnitForm";
import { updateUnit } from "@/features/units/actions";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUnitPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "unit.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this property." />
      </div>
    );
  }

  const [unit, projects, buildings, floors] = await Promise.all([
    unitRepository.findById(id),
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
  ]);
  if (!unit) notFound();

  const boundAction = updateUnit.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={unit.unitNumber}
        breadcrumbs={[
          { label: "Properties", href: "/admin/properties" },
          { label: unit.unitNumber, href: `/admin/properties/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <UnitForm action={boundAction} unit={unit} projects={projects} buildings={buildings} floors={floors} submitLabel="Save Changes" />
      </div>
    </>
  );
}
