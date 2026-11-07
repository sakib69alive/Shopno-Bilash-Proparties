import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FloorPlansEditor } from "@/components/admin/projects/FloorPlansEditor";
import { projectRepository } from "@/features/projects/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Whole-floor plans of the building, with each flat marked — what owners see with their own flat highlighted. */
export default async function ProjectFloorPlansPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to change this project's floor plans." />
      </div>
    );
  }

  let project;
  let floorList: { number: number; label: string; flats: number }[] = [];
  try {
    project = await projectRepository.findById(id);
    const [floors, units] = await Promise.all([floorRepository.list(), unitRepository.list()]);
    const mine = units.filter((u) => u.projectId === id);
    const byNumber = new Map<number, { number: number; label: string; flats: number }>();
    for (const f of floors.filter((x) => x.projectId === id)) {
      const row = byNumber.get(f.floorNumber) ?? { number: f.floorNumber, label: f.label, flats: 0 };
      row.flats += mine.filter((u) => u.floorId === f.id).length;
      byNumber.set(f.floorNumber, row);
    }
    floorList = [...byNumber.values()].sort((a, b) => a.number - b.number);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This project couldn't be loaded. Please try again." />
      </div>
    );
  }
  if (!project) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="max-w-3xl">
        <h2 className="text-h3">Floor plans</h2>
        <p className="text-body-sm text-fg-muted mt-1.5">
          Upload the architect&rsquo;s <b>whole floor</b> once, tell it which floors use it, and mark where each flat (A, B, C…) sits. When an owner opens their flat they see this plan
          with <b>their own flat lit up</b> and the other flats dimmed. Most buildings need one <b>typical floor</b> (leave Floors empty) and, only if they differ, a plan for those floors
          (for example the ground floor as <b>0</b> or a penthouse). A single flat can still have its own custom plan from its edit page, which wins over these.
        </p>
      </div>
      <FloorPlansEditor projectId={project.id} initial={project.floorPlans ?? []} floors={floorList} />
    </div>
  );
}
