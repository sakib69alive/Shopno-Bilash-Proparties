import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PhaseForm } from "@/components/admin/construction/PhaseForm";
import { createPhase } from "@/features/construction/phaseActions";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { contractorRepository } from "@/features/contractors/repository";

export default async function NewPhasePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a construction phase." />
      </div>
    );
  }

  const [projects, buildings, floors, units, contractors] = await Promise.all([
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    unitRepository.list(),
    contractorRepository.list(),
  ]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Phase"}</AdminText>} breadcrumbs={[{ label: "Construction", href: "/admin/construction" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <PhaseForm
          action={createPhase}
          projects={projects}
          buildings={buildings}
          floors={floors}
          units={units}
          contractors={contractors}
          submitLabel="Add Phase"
        />
      </div>
    </>
  );
}
