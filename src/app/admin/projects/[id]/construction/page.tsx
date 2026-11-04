import { notFound } from "next/navigation";
import Link from "next/link";
import { HardHat, ArrowRight, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { ProgressBar } from "@/components/admin/construction/ProgressBar";
import { ConstructionTimelineChart } from "@/components/admin/construction/ConstructionTimelineChart";
import { MilestonePanel } from "@/components/admin/construction/MilestonePanel";
import { ActivityLogPanel } from "@/components/admin/construction/ActivityLogPanel";
import { formatBDT, formatDate } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import { constructionPhaseRepository, constructionTaskRepository, milestoneRepository, constructionActivityLogRepository } from "@/features/construction/repository";
import { contractorRepository, contractorPaymentRepository } from "@/features/contractors/repository";
import { purchaseRepository } from "@/features/procurement/repository";
import { projectExpenseRepository } from "@/features/finance/repository";
import { canAccessProject } from "@/lib/projectScope";
import { getProjectWorkspaceStats, type ProjectWorkspaceStats } from "@/features/projects/workspaceStats";
import { derivePhaseProgress, deriveScheduleDelay, computePhaseActualCost } from "@/lib/constructionProgress";
import type { Project } from "@/types/project";
import type { ConstructionPhase, ConstructionTask, Milestone, ConstructionActivityLog } from "@/types/construction";
import type { Contractor, ContractorPayment } from "@/types/contractor";
import type { Purchase } from "@/types/procurement";
import type { ProjectExpense } from "@/types/finance/project";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** A real project-scoped construction dashboard (§26) — reuses `getProjectWorkspaceStats` for the shared headline numbers, then layers the timeline/milestones/activity/enriched table that only make sense here. */
export default async function ProjectConstructionPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Construction." />
      </div>
    );
  }

  let project: Project | null | undefined;
  let phases: ConstructionPhase[] | undefined;
  let tasks: ConstructionTask[] | undefined;
  let milestones: Milestone[] | undefined;
  let contractors: Contractor[] | undefined;
  let activity: ConstructionActivityLog[] | undefined;
  let stats: ProjectWorkspaceStats | undefined;
  let projectPurchases: Purchase[] | undefined;
  let projectExpenses: ProjectExpense[] | undefined;
  let projectPayments: ContractorPayment[] | undefined;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      const [allPhases, allTasks, allMilestones, allContractors, allActivity, allPurchases, allExpenses, allPayments, workspaceStats] = await Promise.all([
        constructionPhaseRepository.list(),
        constructionTaskRepository.list(),
        milestoneRepository.list(),
        contractorRepository.list(),
        constructionActivityLogRepository.list(),
        purchaseRepository.list(),
        projectExpenseRepository.list(),
        contractorPaymentRepository.list(),
        getProjectWorkspaceStats(id),
      ]);
      phases = allPhases.filter((p) => p.projectId === id).sort((a, b) => a.order - b.order);
      const phaseIds = new Set(phases.map((p) => p.id));
      tasks = allTasks.filter((t) => t.projectId === id);
      milestones = allMilestones.filter((m) => m.projectId === id);
      activity = allActivity.filter((a) => a.projectId === id);
      projectPurchases = allPurchases.filter((p) => p.constructionPhaseId && phaseIds.has(p.constructionPhaseId));
      projectExpenses = allExpenses.filter((e) => e.constructionPhaseId && phaseIds.has(e.constructionPhaseId));
      projectPayments = allPayments.filter((p) => p.phaseId && phaseIds.has(p.phaseId));
      const activeContractorIds = new Set(
        phases.filter((p) => p.status !== "completed" && p.status !== "cancelled" && p.contractorId).map((p) => p.contractorId!),
      );
      contractors = allContractors.filter((c) => activeContractorIds.has(c.id));
      stats = workspaceStats;
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Construction couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !phases || !tasks || !milestones || !contractors || !activity || !stats || !projectPurchases || !projectExpenses || !projectPayments) {
    notFound();
  }
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "construction.manage");
  const effectiveProgressOf = (phase: (typeof phases)[number]) =>
    derivePhaseProgress(
      phase,
      tasks.filter((t) => t.phaseId === phase.id),
      milestones.filter((m) => m.relatedPhaseId === phase.id),
    );

  let totalEstimated = 0;
  let totalActual = 0;
  for (const phase of phases) {
    const summary = computePhaseActualCost(phase, projectPurchases, projectExpenses, projectPayments);
    totalEstimated += summary.estimatedCost;
    totalActual += summary.actualCost;
  }

  const recentActivity = [...activity].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">{phases.length} phase(s) recorded for this project.</p>
        <div className="flex items-center gap-3">
          {canManage && (
            <Link href="/admin/construction/new" className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors">
              <Plus aria-hidden className="size-3.5" />
              Add Phase
            </Link>
          )}
          <Link
            href={`/admin/construction?projectId=${project.id}`}
            className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Manage all phases <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>

      {phases.length === 0 ? (
        <EmptyState
          icon={HardHat}
          title="No construction stages have been configured for this project yet"
          description="Track this project's build stages once phases are added."
          action={
            <Link href="/admin/construction/new" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Plus aria-hidden className="size-4" />
              Add Construction Stage
            </Link>
          }
        />
      ) : (
        <>
          <DashboardSection title="Overview">
            <KpiCard label="Overall Progress" value={stats.averageConstructionProgress} formatValue={(v) => `${v}%`} />
            <KpiCard label="Phases" value={phases.length} />
            <KpiCard label="Delayed" value={stats.delayedPhaseCount} status={stats.delayedPhaseCount > 0 ? "error" : "success"} />
            <KpiCard label="Active Contractors" value={contractors.length} />
            <KpiCard label="Estimated Cost" value={totalEstimated} formatValue={formatBDT} />
            <KpiCard label="Actual Cost (tagged)" value={totalActual} formatValue={formatBDT} />
          </DashboardSection>

          {stats.currentConstructionStage && (
            <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4">
              <p className="text-label text-fg-subtle uppercase">Current Construction Stage</p>
              <div className="flex items-center justify-between">
                <Link href={`/admin/construction/${stats.currentConstructionStage.id}`} className="text-h4 text-fg hover:text-accent transition-colors">
                  {stats.currentConstructionStage.name}
                </Link>
                <StatusBadge status={stats.currentConstructionStage.status} />
              </div>
              <ProgressBar value={stats.currentConstructionStage.progress} className="max-w-md" />
              <p className="text-caption text-fg-subtle">
                Target completion:{" "}
                {stats.currentConstructionStage.targetEndDate ? formatDate(new Date(stats.currentConstructionStage.targetEndDate)) : "not set"}
                {stats.currentConstructionStage.isDelayed && <span className="text-error"> — {stats.currentConstructionStage.daysDelayed} days delayed</span>}
                {stats.nextConstructionStage && ` · Next: ${stats.nextConstructionStage.name}`}
              </p>
            </div>
          )}

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Timeline</h2>
            <ConstructionTimelineChart phases={phases} effectiveProgressOf={effectiveProgressOf} />
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Phases</h2>
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-3 font-normal">Phase</th>
                    <th className="px-4 py-3 font-normal">Contractor</th>
                    <th className="px-4 py-3 font-normal">Progress</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 font-normal">Target End</th>
                  </tr>
                </thead>
                <tbody>
                  {phases.map((phase) => {
                    const delay = deriveScheduleDelay(phase.endDate, phase.actualEndDate, phase.status);
                    const contractor = contractors.find((c) => c.id === phase.contractorId);
                    return (
                      <tr key={phase.id} className="border-border text-body-sm border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <Link href={`/admin/construction/${phase.id}`} className="text-fg hover:text-accent transition-colors">
                            {phase.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">{contractor?.name ?? phase.contractorName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <ProgressBar value={effectiveProgressOf(phase)} className="min-w-32" />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={phase.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            {phase.endDate ? formatDate(new Date(phase.endDate)) : "—"}
                            {delay.isDelayed && <span className="text-caption text-error">+{delay.daysDelayed}d</span>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Milestones</h2>
            <MilestonePanel projectId={project.id} milestones={milestones} phases={phases} canManage={canManage} />
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Recent Activity</h2>
            <ActivityLogPanel projectId={project.id} entries={recentActivity} contractors={contractors} canManage={canManage} />
          </section>
        </>
      )}
    </div>
  );
}
