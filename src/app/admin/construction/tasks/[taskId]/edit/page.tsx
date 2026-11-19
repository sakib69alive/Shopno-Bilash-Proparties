import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TaskForm } from "@/components/admin/construction/TaskForm";
import { updateTask } from "@/features/construction/taskActions";
import { constructionPhaseRepository, constructionTaskRepository } from "@/features/construction/repository";
import { userRepository } from "@/features/users/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { contractorRepository } from "@/features/contractors/repository";

interface PageProps {
  params: Promise<{ taskId: string }>;
}

export default async function EditTaskPage({ params }: PageProps) {
  const { taskId } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this task." />
      </div>
    );
  }

  const task = await constructionTaskRepository.findById(taskId);
  if (!task) notFound();

  const [phase, users, allBuildings, allFloors, contractors, allTasks] = await Promise.all([
    constructionPhaseRepository.findById(task.phaseId),
    userRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    contractorRepository.list(),
    constructionTaskRepository.list(),
  ]);
  if (!phase) notFound();

  const buildings = allBuildings.filter((b) => b.projectId === phase.projectId);
  const floors = allFloors.filter((f) => f.projectId === phase.projectId);
  const otherTasks = allTasks.filter((t) => t.phaseId === phase.id && t.id !== taskId);

  const boundAction = updateTask.bind(null, taskId);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Task"}</AdminText>}
        breadcrumbs={[
          { label: "Construction", href: "/admin/construction" },
          { label: phase.name, href: `/admin/construction/${phase.id}` },
          { label: "Edit Task", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <TaskForm
          action={boundAction}
          phaseId={phase.id}
          task={task}
          users={users}
          buildings={buildings}
          floors={floors}
          contractors={contractors}
          otherTasks={otherTasks}
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
