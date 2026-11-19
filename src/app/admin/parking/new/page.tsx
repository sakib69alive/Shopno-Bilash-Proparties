import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ParkingForm } from "@/components/admin/parking/ParkingForm";
import { createParking } from "@/features/parking/actions";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewParkingPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "parking.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a parking space." />
      </div>
    );
  }

  const [allProjects, buildings] = await Promise.all([projectRepository.list(), buildingRepository.list()]);
  const projects = filterVisibleProjectsList(user, allProjects);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Add Parking"}</AdminText>} breadcrumbs={[{ label: "Parking", href: "/admin/parking" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ParkingForm action={createParking} projects={projects} buildings={buildings} submitLabel="Add Parking" defaultProjectId={projectId} />
      </div>
    </>
  );
}
