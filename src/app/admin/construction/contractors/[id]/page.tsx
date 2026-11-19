import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { SetLifecycleStatusButton } from "@/components/admin/procurement/SetLifecycleStatusButton";
import { DeleteContractorButton } from "@/components/admin/construction/DeleteContractorButton";
import { formatBDT, formatDate } from "@/lib/format";
import { contractorRepository, contractorPaymentRepository } from "@/features/contractors/repository";
import { setContractorStatus } from "@/features/contractors/actions";
import { constructionPhaseRepository, constructionTaskRepository } from "@/features/construction/repository";
import { projectRepository } from "@/features/projects/repository";
import { deriveScheduleDelay } from "@/lib/constructionProgress";

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

/**
 * A contractor is not project-bound (§15) — this page aggregates their real
 * activity across every phase/task/payment that currently points at them.
 * No performance "score" is fabricated (§17) — only real counts and sums.
 */
export default async function ContractorDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this contractor." />
      </div>
    );
  }

  let contractor, phases, tasks, payments, projectsById;
  try {
    contractor = await contractorRepository.findById(id);
    if (!contractor) notFound();

    const [allPhases, allTasks, allPayments, allProjects] = await Promise.all([
      constructionPhaseRepository.list(),
      constructionTaskRepository.list(),
      contractorPaymentRepository.list(),
      projectRepository.list(),
    ]);
    phases = allPhases.filter((p) => p.contractorId === id);
    tasks = allTasks.filter((t) => t.contractorId === id);
    payments = allPayments.filter((p) => p.contractorId === id);
    projectsById = new Map(allProjects.map((p) => [p.id, p]));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This contractor couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!contractor) notFound();

  const canManage = hasPermission(user.role, "construction.manage");
  const assignedProjectIds = new Set([...phases.map((p) => p.projectId), ...tasks.map((t) => t.projectId)]);
  const activePhases = phases.filter((p) => p.status === "in-progress" || p.status === "planned");
  const completedPhases = phases.filter((p) => p.status === "completed");
  const delayedPhases = phases.filter((p) => deriveScheduleDelay(p.endDate, p.actualEndDate, p.status).isDelayed);
  const activeTasks = tasks.filter((t) => t.status === "in-progress" || t.status === "not-started" || t.status === "planned");
  const totalPaid = payments.reduce((s, p) => s + p.amount.amount, 0);

  return (
    <>
      <AdminPageHeader
        title={contractor.name}
        breadcrumbs={[
          { label: "Construction", href: "/admin/construction" },
          { label: "Contractors", href: "/admin/construction/contractors" },
          { label: contractor.name },
        ]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={contractor.status === "inactive" ? "inactive" : "active"} />
            {canManage && (
              <>
                <SetLifecycleStatusButton status={contractor.status} label={contractor.name} onSetStatus={setContractorStatus.bind(null, contractor.id)} />
                <Link href={`/admin/construction/contractors/${contractor.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  <AdminText>{"Edit"}</AdminText>
                </Link>
                <DeleteContractorButton id={contractor.id} name={contractor.name} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Contact"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Company" value={contractor.companyName ?? "—"} />
              <Fact label="Contact Person" value={contractor.contactPerson ?? "—"} />
              <Fact label="Phone" value={contractor.phone} />
              <Fact label="Email" value={contractor.email ?? "—"} />
              <Fact label="Specialty" value={contractor.specialty ?? "—"} />
              <Fact label="Address" value={contractor.address ?? "—"} />
            </div>
            {contractor.notes && <p className="text-body-sm text-fg-muted mt-2">{contractor.notes}</p>}
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(contractor.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(contractor.updatedAt))} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <DashboardSection title="Performance">
            <KpiCard label="Assigned Projects" value={assignedProjectIds.size} />
            <KpiCard label="Active Stages" value={activePhases.length} />
            <KpiCard label="Completed Stages" value={completedPhases.length} />
            <KpiCard label="Delayed Stages" value={delayedPhases.length} status={delayedPhases.length > 0 ? "error" : "success"} />
            <KpiCard label="Active Tasks" value={activeTasks.length} />
            <KpiCard label="Total Recorded Payments" value={totalPaid} formatValue={formatBDT} />
          </DashboardSection>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Assigned Phases"}</AdminText></h2>
            {phases.length === 0 ? (
              <EmptyState title="No phases assigned yet" description="Construction phases assigned to this contractor will appear here." />
            ) : (
              <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                {phases.map((phase) => (
                  <Link
                    key={phase.id}
                    href={`/admin/construction/${phase.id}`}
                    className="border-border hover:bg-surface flex items-center justify-between gap-3 border-b p-3 transition-colors last:border-b-0"
                  >
                    <div>
                      <p className="text-body-sm text-fg font-medium">{phase.name}</p>
                      <p className="text-caption text-fg-subtle mt-0.5">{projectsById.get(phase.projectId)?.name ?? "Unknown project"}</p>
                    </div>
                    <StatusBadge status={phase.status} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
