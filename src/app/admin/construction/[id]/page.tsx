import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeletePhaseButton } from "@/components/admin/construction/DeletePhaseButton";
import { TaskRowActions } from "@/components/admin/construction/TaskRowActions";
import { ProgressBar } from "@/components/admin/construction/ProgressBar";
import { ContractorAssignmentPanel } from "@/components/admin/construction/ContractorAssignmentPanel";
import { ScheduleRevisionPanel } from "@/components/admin/construction/ScheduleRevisionPanel";
import { PhaseCostPanel } from "@/components/admin/construction/PhaseCostPanel";
import { ActivityLogPanel } from "@/components/admin/construction/ActivityLogPanel";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDate, formatNumber } from "@/lib/format";
import { constructionPhaseRepository, constructionTaskRepository, scheduleRevisionRepository, constructionActivityLogRepository } from "@/features/construction/repository";
import { contractorRepository, contractorAssignmentRepository, contractorPaymentRepository } from "@/features/contractors/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject } from "@/lib/projectScope";
import { userRepository } from "@/features/users/repository";
import { purchaseRepository, materialRepository, stockMovementRepository } from "@/features/procurement/repository";
import { projectExpenseRepository, cashAccountRepository } from "@/features/finance/repository";
import { derivePhaseProgress, deriveScheduleDelay, computePhaseActualCost } from "@/lib/constructionProgress";
import { milestoneRepository } from "@/features/construction/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

export default async function AdminConstructionPhaseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this phase." />
      </div>
    );
  }

  let phase, project, tasks, contractors, assignmentHistory, revisionHistory, purchases, expenses, payments, materialsById, usageMovements, activityEntries, milestones, accounts;
  try {
    phase = await constructionPhaseRepository.findById(id);
    if (!phase) notFound();

    const [
      project_,
      allTasks,
      allContractors,
      allAssignments,
      allRevisions,
      allPurchases,
      allExpenses,
      allPayments,
      allMaterials,
      allMovements,
      allActivity,
      allMilestones,
      allAccounts,
    ] = await Promise.all([
      projectRepository.findById(phase.projectId),
      constructionTaskRepository.list(),
      contractorRepository.list(),
      contractorAssignmentRepository.list(),
      scheduleRevisionRepository.list(),
      purchaseRepository.list(),
      projectExpenseRepository.list(),
      contractorPaymentRepository.list(),
      materialRepository.list(),
      stockMovementRepository.list(),
      constructionActivityLogRepository.list(),
      milestoneRepository.list(),
      cashAccountRepository.list(),
    ]);

    project = project_;
    accounts = allAccounts;
    tasks = allTasks.filter((t) => t.phaseId === id).sort((a, b) => a.title.localeCompare(b.title));
    contractors = allContractors.filter((c) => c.status !== "inactive" || c.id === phase!.contractorId);
    assignmentHistory = allAssignments.filter((a) => a.phaseId === id);
    revisionHistory = allRevisions.filter((r) => r.targetType === "phase" && r.targetId === id);
    purchases = allPurchases.filter((p) => p.constructionPhaseId === id);
    expenses = allExpenses.filter((e) => e.constructionPhaseId === id);
    payments = allPayments.filter((p) => p.phaseId === id);
    materialsById = new Map(allMaterials.map((m) => [m.id, m]));
    usageMovements = allMovements.filter((m) => m.constructionPhaseId === id && (m.type === "used" || m.type === "wastage"));
    activityEntries = allActivity.filter((a) => a.phaseId === id);
    milestones = allMilestones.filter((m) => m.relatedPhaseId === id);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This phase couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!phase) notFound();
  if (!canAccessProject(user, phase.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This phase belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "construction.manage");

  const responsibleUsers = new Map(
    (
      await Promise.all(
        Array.from(new Set(tasks.map((t) => t.responsibleUserId).filter((v): v is string => Boolean(v)))).map(
          async (uid) => [uid, await userRepository.findById(uid)] as const,
        ),
      )
    ).map(([uid, u]) => [uid, u?.name ?? "—"]),
  );

  const effectiveProgress = derivePhaseProgress(phase, tasks, milestones);
  const delay = deriveScheduleDelay(phase.endDate, phase.actualEndDate, phase.status);
  const costSummary = computePhaseActualCost(phase, purchases, expenses, payments);
  const materialUsageByMaterial = new Map<string, number>();
  for (const m of usageMovements) {
    materialUsageByMaterial.set(m.materialId, (materialUsageByMaterial.get(m.materialId) ?? 0) + m.quantity);
  }

  return (
    <>
      <AdminPageHeader
        title={phase.name}
        breadcrumbs={[{ label: "Construction", href: "/admin/construction" }, { label: phase.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={phase.status} />
            {delay.isDelayed && <span className="text-caption text-error bg-error-soft rounded-full px-2.5 py-1">+{delay.daysDelayed}d delayed</span>}
            {canManage && (
              <>
                <Link href={`/admin/construction/${phase.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  <AdminText>{"Edit"}</AdminText>
                </Link>
                <DeletePhaseButton id={phase.id} name={phase.name} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Project" value={project ? project.name : "—"} />
              <Fact label="Order" value={String(phase.order)} />
            </div>
            <div>
              <p className="text-caption text-fg-subtle mb-1 uppercase">Progress ({phase.trackingMethod ?? "manual"})</p>
              <ProgressBar value={effectiveProgress} />
            </div>
            {phase.description && <p className="text-body-sm text-fg-muted">{phase.description}</p>}
          </div>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Timeline"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Planned Start" value={phase.startDate ? formatDate(new Date(phase.startDate)) : "—"} />
              <Fact label="Planned Target End" value={phase.endDate ? formatDate(new Date(phase.endDate)) : "—"} />
              <Fact label="Actual Start" value={phase.actualStartDate ? formatDate(new Date(phase.actualStartDate)) : "—"} />
              <Fact label="Actual End" value={phase.actualEndDate ? formatDate(new Date(phase.actualEndDate)) : "—"} />
            </div>
            {canManage && (
              <div className="mt-3">
                <ScheduleRevisionPanel targetType="phase" targetId={phase.id} currentTargetDate={phase.endDate} history={revisionHistory} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Contractor"}</AdminText></h2>
            {canManage ? (
              <ContractorAssignmentPanel phaseId={phase.id} currentContractorId={phase.contractorId} contractors={contractors} history={assignmentHistory} />
            ) : (
              <p className="text-body-sm text-fg">
                {phase.contractorId ? contractors.find((c) => c.id === phase!.contractorId)?.name : phase.contractorName ?? "Not assigned"}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Cost"}</AdminText></h2>
            <PhaseCostPanel
              phaseId={phase.id}
              projectId={phase.projectId}
              summary={costSummary}
              purchases={purchases}
              expenses={expenses}
              payments={payments}
              contractors={contractors}
              accounts={accounts!}
              canManage={canManage}
            />
          </section>

          {usageMovements.length > 0 && (
            <section>
              <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Materials Used"}</AdminText></h2>
              <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                {[...materialUsageByMaterial.entries()].map(([materialId, qty]) => {
                  const material = materialsById.get(materialId);
                  return (
                    <div key={materialId} className="border-border flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                      <Link href={`/admin/procurement/materials/${materialId}`} className="text-body-sm text-fg hover:text-accent transition-colors">
                        {material?.name ?? "Unknown material"}
                      </Link>
                      <span className="text-body-sm text-fg-muted tabular-nums">
                        {formatNumber(qty)} {material?.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(phase.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(phase.updatedAt))} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Tasks"}</AdminText></h2>
              {canManage && (
                <Link href={`/admin/construction/${phase.id}/tasks/new`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Plus aria-hidden className="size-3.5" />
                  <AdminText>{"Add Task"}</AdminText>
                </Link>
              )}
            </div>
            {tasks.length === 0 ? (
              <EmptyState title="No tasks yet" description="Tasks added to this phase will appear here." />
            ) : (
              <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                {tasks.map((task) => {
                  const incompleteDeps = (task.dependsOnTaskIds ?? [])
                    .map((depId) => tasks.find((t) => t.id === depId))
                    .filter((dep): dep is NonNullable<typeof dep> => !!dep && dep.status !== "completed");
                  const taskDelay = deriveScheduleDelay(task.endDate, task.completionDate, task.status);
                  return (
                    <div key={task.id} className="border-border flex flex-col gap-2 border-b p-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-body-sm text-fg font-medium">{task.title}</p>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={task.status} />
                          {canManage && <TaskRowActions phaseId={phase.id} taskId={task.id} />}
                        </div>
                      </div>
                      {task.progressPercentage !== undefined && <ProgressBar value={task.progressPercentage} className="max-w-64" />}
                      <div className="text-caption text-fg-subtle flex flex-wrap gap-x-4 gap-y-1">
                        <span><AdminText>{"Responsible:"}</AdminText> {task.responsibleUserId ? (responsibleUsers.get(task.responsibleUserId) ?? "—") : "—"}</span>
                        <span><AdminText>{"Start:"}</AdminText> {task.startDate ? formatDate(new Date(task.startDate)) : "—"}</span>
                        <span>
                          <AdminText>{"Due:"}</AdminText> {task.endDate ? formatDate(new Date(task.endDate)) : "—"}
                          {taskDelay.isDelayed && <span className="text-error"> (+{taskDelay.daysDelayed}d)</span>}
                        </span>
                      </div>
                      {incompleteDeps.length > 0 && (
                        <p className="text-caption text-warning"><AdminText>{"Waiting on:"}</AdminText> {incompleteDeps.map((d) => d.title).join(", ")}</p>
                      )}
                      {task.notes && <p className="text-body-sm text-fg-muted whitespace-pre-line">{task.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Activity Log"}</AdminText></h2>
            <ActivityLogPanel projectId={phase.projectId} phaseId={phase.id} entries={activityEntries} contractors={contractors} canManage={canManage} />
          </div>
        </div>
      </div>
    </>
  );
}
