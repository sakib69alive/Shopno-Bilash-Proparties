import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PhaseForm } from "@/components/admin/construction/PhaseForm";
import { updatePhase } from "@/features/construction/phaseActions";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { contractorRepository } from "@/features/contractors/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPhasePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this phase." />
      </div>
    );
  }

  const [phase, projects, buildings, floors, units, contractors] = await Promise.all([
    constructionPhaseRepository.findById(id),
    projectRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    unitRepository.list(),
    contractorRepository.list(),
  ]);
  if (!phase) notFound();

  const boundAction = updatePhase.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={phase.name}
        breadcrumbs={[
          { label: "Construction", href: "/admin/construction" },
          { label: phase.name, href: `/admin/construction/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PhaseForm
          action={boundAction}
          phase={phase}
          projects={projects}
          buildings={buildings}
          floors={floors}
          units={units}
          contractors={contractors}
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
