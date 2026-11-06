import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteLandownerButton } from "@/components/admin/landowners/DeleteLandownerButton";
import { AgreementRowActions } from "@/components/admin/landowners/AgreementRowActions";
import { UnitAssignmentControl } from "@/components/admin/shared/UnitAssignmentControl";
import { PortalAccessPanel } from "@/components/admin/users/PortalAccessPanel";
import { formatDate } from "@/lib/format";
import {
  landownerRepository,
  agreementRepository,
  landownerAllocationRepository,
} from "@/features/landowners/repository";
import { createLandownerAllocation, deleteLandownerAllocationByUnit } from "@/features/landowners/landownerAllocationActions";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";
import { toPortalAccessView } from "@/features/users/portalAccessView";
import { filterToVisibleProjectsOptional, getVisibleProjectIds } from "@/lib/projectScope";

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
 * Read-only landowner overview — every JV agreement this landowner has
 * with the company, plus units allocated back to them under each,
 * joined against `projectRepository`/`unitRepository`.
 */
export default async function AdminLandownerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "landowner.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this landowner." />
      </div>
    );
  }

  let landowner, agreements, allocations, projects, allUnits, unitsById;
  try {
    landowner = await landownerRepository.findById(id);
    const allAgreements = landowner ? await agreementRepository.list() : [];
    agreements = filterToVisibleProjectsOptional(user, allAgreements.filter((a) => a.landownerId === id));
    const allAllocations = landowner ? await landownerAllocationRepository.list() : [];
    allocations = allAllocations.filter((a) => a.landownerId === id);
    projects = await projectRepository.list();
    allUnits = await unitRepository.list();
    unitsById = new Map(allUnits.map((u) => [u.id, u]));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This landowner couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!landowner) notFound();
  if (agreements.length === 0 && getVisibleProjectIds(user) !== "all") {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This landowner has no agreement for a project you have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "landowner.manage");
  const canManagePortalAccess = hasPermission(user.role, "users.manage");
  const linkedUser = landowner.userId ? await userRepository.findById(landowner.userId) : null;
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const allocationsByAgreement = new Map<string, typeof allocations>();
  for (const a of allocations) {
    const list = allocationsByAgreement.get(a.agreementId) ?? [];
    list.push(a);
    allocationsByAgreement.set(a.agreementId, list);
  }

  return (
    <>
      <AdminPageHeader
        title={landowner.name}
        breadcrumbs={[{ label: "Landowners", href: "/admin/landowners" }, { label: landowner.name }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/landowners/${landowner.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </Link>
              <DeleteLandownerButton id={landowner.id} name={landowner.name} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Email" value={landowner.email} />
              <Fact label="Phone" value={landowner.phone} />
              <Fact label="Land Brought" value={String(landowner.propertyIds.length)} />
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(landowner.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(landowner.updatedAt))} />
            </div>
          </section>

          {canManagePortalAccess && (
            <PortalAccessPanel
              ownerType="landowner"
              ownerId={landowner.id}
              ownerName={landowner.name}
              phone={landowner.phone}
              linkedUser={toPortalAccessView(linkedUser)}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-label text-fg-subtle uppercase">Agreements</h2>
            {canManage && (
              <Link href={`/admin/landowners/${landowner.id}/agreements/new`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Plus aria-hidden className="size-3.5" />
                Add Agreement
              </Link>
            )}
          </div>
          {agreements.length === 0 ? (
            <EmptyState title="No agreements yet" description="JV agreements with this landowner will appear here." />
          ) : (
            <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
              {agreements.map((agreement) => {
                const project = agreement.projectId ? projectsById.get(agreement.projectId) : undefined;
                const assignedUnits = (allocationsByAgreement.get(agreement.id) ?? [])
                  .map((a) => unitsById.get(a.unitId))
                  .filter((u) => u !== undefined)
                  .map((u) => ({ id: u.id, unitNumber: u.unitNumber, sizeSqft: u.sizeSqft }));
                const availableUnits = project
                  ? allUnits
                      .filter((u) => u.projectId === project.id && !u.customerId && !u.shareholderId && !u.landownerAllocationId)
                      .map((u) => ({ id: u.id, unitNumber: u.unitNumber, sizeSqft: u.sizeSqft }))
                  : [];
                return (
                  <div key={agreement.id} className="border-border flex flex-col gap-3 border-b p-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      {project ? (
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-body-sm text-fg font-medium hover:text-accent transition-colors"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        <span className="text-body-sm text-fg-subtle">No project linked</span>
                      )}
                      <div className="flex items-center gap-3">
                        <StatusBadge status={agreement.status} />
                        {canManage && <AgreementRowActions landownerId={landowner.id} agreementId={agreement.id} />}
                      </div>
                    </div>
                    <p className="text-body-sm text-fg-muted">{agreement.termsSummary}</p>
                    <div className="text-caption text-fg-subtle flex flex-wrap gap-x-4 gap-y-1">
                      <span>Signed: {agreement.signedDate ? formatDate(new Date(agreement.signedDate)) : "—"}</span>
                    </div>
                    {canManage && project && (
                      <UnitAssignmentControl
                        assignedUnits={assignedUnits}
                        availableUnits={availableUnits}
                        onAssign={createLandownerAllocation.bind(null, landowner.id, agreement.id)}
                        onUnassign={deleteLandownerAllocationByUnit.bind(null, landowner.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
