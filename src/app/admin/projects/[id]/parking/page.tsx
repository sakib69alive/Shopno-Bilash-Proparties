import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { ProjectParkingHeader } from "@/components/admin/parking/ProjectParkingHeader";
import { projectRepository } from "@/features/projects/repository";
import { parkingRepository } from "@/features/parking/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Real, project-scoped Parking data — the gap the Building/Floor/Unit/Owner/Parking prompt exists to close (Prompt 1 only had a permanent "not tracked yet" placeholder, since no Parking entity existed then). */
export default async function ProjectParkingPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "parking.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Parking." />
      </div>
    );
  }

  let project, parkingSpaces, buildings;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      const [all, allBuildings] = await Promise.all([parkingRepository.list(), buildingRepository.list()]);
      const scoped = all.filter((p) => p.projectId === id);
      buildings = allBuildings.filter((b) => b.projectId === id);
      parkingSpaces = await Promise.all(
        scoped.map(async (p) => ({
          ...p,
          ownerLabel: p.ownerType && p.ownerId ? (await resolveDocumentOwner(p.ownerType, p.ownerId)).label : undefined,
        })),
      );
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Parking couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !parkingSpaces || !buildings) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "parking.manage");

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <ProjectParkingHeader projectId={project.id} buildings={buildings} count={parkingSpaces.length} canManage={canManage} />

      {parkingSpaces.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No parking spaces configured yet"
          description="Add this project's parking spaces to start assigning them — independent of any unit's owner."
          action={
            <Link href={`/admin/parking/new?projectId=${project.id}`} className="text-body-sm text-accent font-medium hover:underline">
              <AdminText>{"Add Parking"}</AdminText>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {parkingSpaces.map((p) => (
            <Link
              key={p.id}
              href={`/admin/parking/${p.id}`}
              className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-fg-subtle"
            >
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-fg font-semibold">{p.parkingNumber}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-caption text-fg-subtle truncate">{p.ownerLabel ?? "No owner assigned"}</p>
            </Link>
          ))}
          <Link
            href={`/admin/parking/new?projectId=${project.id}`}
            className="border-border text-fg-subtle hover:text-fg hover:border-fg-subtle flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 transition-colors"
          >
            <Plus aria-hidden className="size-4" />
            <p className="text-caption"><AdminText>{"Add Parking"}</AdminText></p>
          </Link>
        </div>
      )}
    </div>
  );
}
