import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { PropertiesAdminExplorer } from "@/components/admin/properties/PropertiesAdminExplorer";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { resolveUnitOwner } from "@/features/ownership/resolveUnitOwner";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Admin Step 6 — Property / Unit Management Foundation. Reads
 * `unitRepository` (the internal `types/unit.ts` shape — a sellable unit
 * that must belong to a project) joined against the same
 * `projectRepository` Admin Step 5 already reads. Full create/edit/delete,
 * gated on `unit.manage`.
 */
export default async function AdminPropertiesPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "unit.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Properties." />
      </div>
    );
  }

  let units, projects, buildings, floors, ownerLabels: Record<string, string>;
  try {
    const [allUnits, allProjects, allBuildings, allFloors] = await Promise.all([
      unitRepository.list(),
      projectRepository.list(),
      buildingRepository.list(),
      floorRepository.list(),
    ]);
    units = filterToVisibleProjects(user, allUnits);
    projects = filterVisibleProjectsList(user, allProjects);
    buildings = filterToVisibleProjects(user, allBuildings);
    floors = filterToVisibleProjects(user, allFloors);

    ownerLabels = {};
    for (const unit of units) {
      const ownerRef = await resolveUnitOwner(unit);
      if (ownerRef) ownerLabels[unit.id] = (await resolveDocumentOwner(ownerRef.ownerType, ownerRef.ownerId)).label;
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Properties couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "unit.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Properties"}</AdminText>}
        description={<AdminText>{"Every unit belonging to a project — apartments, commercial spaces, and plots."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/properties/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Property"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <PropertiesAdminExplorer
          units={units}
          projects={projects}
          buildings={buildings}
          floors={floors}
          ownerLabels={ownerLabels}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
