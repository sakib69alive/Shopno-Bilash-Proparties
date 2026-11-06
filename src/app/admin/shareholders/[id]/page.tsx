import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteShareholderButton } from "@/components/admin/shareholders/DeleteShareholderButton";
import { ShareholdingRowActions } from "@/components/admin/shareholders/ShareholdingRowActions";
import { UnitAssignmentControl } from "@/components/admin/shared/UnitAssignmentControl";
import { PortalAccessPanel } from "@/components/admin/users/PortalAccessPanel";
import { formatBDT, formatDate, formatPercent } from "@/lib/format";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { assignUnitToShareholding, unassignUnitFromShareholding } from "@/features/shareholders/shareholdingActions";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";
import { toPortalAccessView } from "@/features/users/portalAccessView";
import { filterToVisibleProjects, getVisibleProjectIds } from "@/lib/projectScope";

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
 * Read-only shareholder overview — every project-scoped stake
 * (`Shareholding`) this shareholder holds, joined against
 * `projectRepository`/`unitRepository` so each stake shows its project
 * name and any units allocated back under it.
 */
export default async function AdminShareholderDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this shareholder." />
      </div>
    );
  }

  let shareholder, holdings, projects, allUnits, unitsById;
  try {
    shareholder = await shareholderRepository.findById(id);
    const allHoldings = shareholder ? await shareholdingRepository.list() : [];
    holdings = filterToVisibleProjects(user, allHoldings.filter((h) => h.shareholderId === id));
    projects = await projectRepository.list();
    allUnits = await unitRepository.list();
    unitsById = new Map(allUnits.map((u) => [u.id, u]));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This shareholder couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!shareholder) notFound();
  if (holdings.length === 0 && getVisibleProjectIds(user) !== "all") {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This shareholder has no stake in a project you have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "shareholder.manage");
  const canManagePortalAccess = hasPermission(user.role, "users.manage");
  const linkedUser = shareholder.userId ? await userRepository.findById(shareholder.userId) : null;
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const totalContribution = holdings.reduce((sum, h) => sum + h.totalContribution.amount, 0);

  return (
    <>
      <AdminPageHeader
        title={shareholder.name}
        breadcrumbs={[{ label: "Shareholders", href: "/admin/shareholders" }, { label: shareholder.name }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/shareholders/${shareholder.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </Link>
              <DeleteShareholderButton id={shareholder.id} name={shareholder.name} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Contact</h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Email" value={shareholder.email} />
              <Fact label="Phone" value={shareholder.phone} />
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Total Contribution</h2>
            <div className="border-border bg-surface-raised rounded-lg border p-4">
              <p className="text-title-md text-fg font-semibold">{formatBDT(totalContribution)}</p>
              <p className="text-caption text-fg-subtle mt-1">
                Across {holdings.length} {holdings.length === 1 ? "project" : "projects"}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(shareholder.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(shareholder.updatedAt))} />
            </div>
          </section>

          {canManagePortalAccess && (
            <PortalAccessPanel
              ownerType="shareholder"
              ownerId={shareholder.id}
              ownerName={shareholder.name}
              phone={shareholder.phone}
              linkedUser={toPortalAccessView(linkedUser)}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-label text-fg-subtle uppercase">Shareholdings</h2>
            {canManage && (
              <Link href={`/admin/shareholders/${shareholder.id}/holdings/new`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Plus aria-hidden className="size-3.5" />
                Add Shareholding
              </Link>
            )}
          </div>
          {holdings.length === 0 ? (
            <EmptyState title="No shareholdings yet" description="Stakes recorded for this shareholder will appear here." />
          ) : (
            <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
              {holdings.map((holding) => {
                const project = projectsById.get(holding.projectId);
                const assignedUnits = holding.allocatedUnitIds
                  .map((uid) => unitsById.get(uid))
                  .filter((u) => u !== undefined)
                  .map((u) => ({ id: u.id, unitNumber: u.unitNumber, sizeSqft: u.sizeSqft }));
                const availableUnits = allUnits
                  .filter((u) => u.projectId === holding.projectId && !u.customerId && !u.shareholderId && !u.landownerAllocationId)
                  .map((u) => ({ id: u.id, unitNumber: u.unitNumber, sizeSqft: u.sizeSqft }));
                return (
                  <div key={holding.id} className="border-border flex flex-col gap-3 border-b p-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      {project ? (
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-body-sm text-fg font-medium hover:text-accent transition-colors"
                        >
                          {project.name}
                        </Link>
                      ) : (
                        <span className="text-body-sm text-fg-subtle">Unknown project</span>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-body-sm text-fg tabular-nums">{formatPercent(holding.sharePercentage / 100)}</span>
                        {canManage && <ShareholdingRowActions shareholderId={shareholder.id} holdingId={holding.id} />}
                      </div>
                    </div>
                    <div className="text-caption text-fg-subtle flex flex-wrap gap-x-4 gap-y-1">
                      <span>Contribution: {formatBDT(holding.totalContribution.amount)}</span>
                    </div>
                    {canManage && project && (
                      <UnitAssignmentControl
                        assignedUnits={assignedUnits}
                        availableUnits={availableUnits}
                        onAssign={assignUnitToShareholding.bind(null, shareholder.id, holding.id)}
                        onUnassign={unassignUnitFromShareholding.bind(null, shareholder.id, holding.id)}
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
