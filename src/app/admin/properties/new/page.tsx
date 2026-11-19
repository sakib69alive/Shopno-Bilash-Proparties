import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UnitForm } from "@/components/admin/properties/UnitForm";
import { createUnit } from "@/features/units/actions";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewUnitPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "unit.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a property." />
      </div>
    );
  }

  const [projects, buildings, floors] = await Promise.all([
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
  ]);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Property"}</AdminText>}
        breadcrumbs={[{ label: "Properties", href: "/admin/properties" }, { label: "New", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <UnitForm
          action={createUnit}
          projects={projects}
          buildings={buildings}
          floors={floors}
          submitLabel="Create Property"
          defaultProjectId={projectId}
        />
      </div>
    </>
  );
}
