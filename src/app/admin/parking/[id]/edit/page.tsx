import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ParkingForm } from "@/components/admin/parking/ParkingForm";
import { updateParking } from "@/features/parking/actions";
import { parkingRepository } from "@/features/parking/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { canAccessProject, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditParkingPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "parking.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this parking space." />
      </div>
    );
  }

  const [parking, allProjects, buildings] = await Promise.all([
    parkingRepository.findById(id),
    projectRepository.list(),
    buildingRepository.list(),
  ]);
  if (!parking) notFound();
  if (!canAccessProject(user, parking.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This parking space belongs to a project you don't have access to." />
      </div>
    );
  }

  const projects = filterVisibleProjectsList(user, allProjects);
  const boundAction = updateParking.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={parking.parkingNumber}
        breadcrumbs={[
          { label: "Parking", href: "/admin/parking" },
          { label: parking.parkingNumber, href: `/admin/parking/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ParkingForm action={boundAction} parking={parking} projects={projects} buildings={buildings} submitLabel="Save Changes" />
      </div>
    </>
  );
}
