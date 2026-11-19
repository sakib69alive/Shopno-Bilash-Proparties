import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StockMovementForm } from "@/components/admin/procurement/StockMovementForm";
import { createStockMovement } from "@/features/procurement/stockMovementActions";
import { projectRepository } from "@/features/projects/repository";
import { materialRepository } from "@/features/procurement/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewStockMovementPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record a stock movement." />
      </div>
    );
  }

  const [allProjects, materials, buildings, floors, units, constructionPhases] = await Promise.all([
    projectRepository.list(),
    materialRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    unitRepository.list(),
    constructionPhaseRepository.list(),
  ]);
  const projects = filterVisibleProjectsList(user, allProjects);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Record Stock Movement"}</AdminText>}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Stock", href: "/admin/procurement/stock" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <StockMovementForm
          action={createStockMovement}
          projects={projects}
          materials={materials}
          buildings={buildings}
          floors={floors}
          units={units}
          constructionPhases={constructionPhases}
          defaultProjectId={projectId}
        />
      </div>
    </>
  );
}
