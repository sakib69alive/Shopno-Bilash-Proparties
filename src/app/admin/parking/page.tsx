import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ParkingAdminExplorer, type ParkingRow } from "@/components/admin/parking/ParkingAdminExplorer";
import { parkingRepository } from "@/features/parking/repository";
import { projectRepository } from "@/features/projects/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function AdminParkingPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "parking.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Parking." />
      </div>
    );
  }

  let parkingSpaces: ParkingRow[], projects;
  try {
    const [allParking, allProjects] = await Promise.all([parkingRepository.list(), projectRepository.list()]);
    const scoped = filterToVisibleProjects(user, allParking);
    parkingSpaces = await Promise.all(
      scoped.map(async (p) => ({
        ...p,
        ownerLabel: p.ownerType && p.ownerId ? (await resolveDocumentOwner(p.ownerType, p.ownerId)).label : undefined,
      })),
    );
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Parking couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "parking.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Parking"}</AdminText>}
        description={<AdminText>{"Every parking space across your projects — independent of any unit's owner."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/parking/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Parking"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ParkingAdminExplorer
          parkingSpaces={parkingSpaces}
          projects={projects}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
