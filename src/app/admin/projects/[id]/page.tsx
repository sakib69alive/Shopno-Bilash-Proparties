import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { Media } from "@/components/ui/Media";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, formatBDT } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import { getProjectWorkspaceStats } from "@/features/projects/workspaceStats";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { unitRepository } from "@/features/units/repository";
import { parkingRepository } from "@/features/parking/repository";
import { canAccessProject } from "@/lib/projectScope";

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

/** Project Workspace's Dashboard tab — the fact sheet this page always had, plus real KPI sections computed from `getProjectWorkspaceStats`. Header/breadcrumb/tabs are owned by `layout.tsx`; this page re-checks auth/scope itself, same as every other tab. */
export default async function AdminProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this project." />
      </div>
    );
  }

  let project, stats;
  try {
    project = await projectRepository.findById(id);
    if (project) stats = await getProjectWorkspaceStats(id);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This project couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !stats) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const reservedOrBooked = (stats.unitsByStatus.reserved ?? 0) + (stats.unitsByStatus.booked ?? 0) + (stats.unitsByStatus["under-agreement"] ?? 0);
  const soldOrTransferred = (stats.unitsByStatus.sold ?? 0) + (stats.unitsByStatus.transferred ?? 0) + (stats.unitsByStatus.allocated ?? 0);

  const recentAssignments = await Promise.all(
    stats.recentOwnershipRecords.map(async (row) => {
      const owner = await resolveDocumentOwner(row.ownerType, row.ownerId);
      const target =
        row.targetType === "unit" ? await unitRepository.findById(row.targetId) : await parkingRepository.findById(row.targetId);
      const targetLabel = target ? ("unitNumber" in target ? target.unitNumber : target.parkingNumber) : "Unknown";
      return { id: row.id, ownerLabel: owner.label, targetLabel, startDate: row.startDate };
    }),
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {stats.overdueContributionCount > 0 && (
        <div className="bg-error-soft text-error flex items-center gap-2.5 rounded-md px-4 py-3">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          <p className="text-body-sm flex-1">
            {stats.overdueContributionCount}<AdminText>{" owner contribution"}</AdminText>{stats.overdueContributionCount === 1 ? "" : "s"} overdue on this
            project.
          </p>
          <Link href={`/admin/projects/${id}/reports`} className="text-body-sm font-medium underline">
            Review →
          </Link>
        </div>
      )}

      <DashboardSection title="Unit Overview">
        {stats.unitTotal === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="No units added yet"
              description="Units for this project will appear here once added."
              action={
                <Link href="/admin/properties/new" className="text-body-sm text-accent font-medium hover:underline">
                  <AdminText>{"Add Unit"}</AdminText>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <KpiCard label="Total Units" value={stats.unitTotal} />
            <KpiCard label="Available" value={stats.unitsByStatus.available ?? 0} />
            <KpiCard label="Reserved / Booked" value={reservedOrBooked} />
            <KpiCard label="Sold / Transferred" value={soldOrTransferred} />
            <KpiCard label="Occupancy" value={stats.unitOccupancyPercent} formatValue={(v) => `${v}%`} />
            <KpiCard label="Total Sales Value" value={stats.unitSalesValue} formatValue={formatBDT} />
          </>
        )}
      </DashboardSection>

      <DashboardSection title="Construction Overview">
        {stats.constructionPhaseCount === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="No construction phases yet"
              description="Track this project's build stages once phases are added."
              action={
                <Link href="/admin/construction" className="text-body-sm text-accent font-medium hover:underline">
                  <AdminText>{"Add Phase"}</AdminText>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <KpiCard label="Phases" value={stats.constructionPhaseCount} />
            <KpiCard
              label="Overall Progress"
              value={stats.averageConstructionProgress}
              formatValue={(v) => `${v}%`}
            />
            <KpiCard
              label="Delayed"
              value={stats.delayedPhaseCount}
              status={stats.delayedPhaseCount > 0 ? "error" : "success"}
            />
          </>
        )}
      </DashboardSection>

      {(stats.currentConstructionStage || stats.nextConstructionStage) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stats.currentConstructionStage && (
            <Link
              href={`/admin/construction/${stats.currentConstructionStage.id}`}
              className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-fg-subtle"
            >
              <p className="text-label text-fg-subtle uppercase"><AdminText>{"Current Construction Stage"}</AdminText></p>
              <div className="flex items-center justify-between">
                <p className="text-h4 text-fg">{stats.currentConstructionStage.name}</p>
                <StatusBadge status={stats.currentConstructionStage.status} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Fact label="Progress" value={`${stats.currentConstructionStage.progress}%`} />
                <Fact
                  label="Target Completion"
                  value={stats.currentConstructionStage.targetEndDate ? formatDate(new Date(stats.currentConstructionStage.targetEndDate)) : "—"}
                />
                <Fact
                  label="Delay"
                  value={stats.currentConstructionStage.isDelayed ? `${stats.currentConstructionStage.daysDelayed} days` : "On schedule"}
                />
              </div>
            </Link>
          )}
          {stats.nextConstructionStage && (
            <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border border-dashed p-4">
              <p className="text-label text-fg-subtle uppercase"><AdminText>{"Next Stage"}</AdminText></p>
              <p className="text-h4 text-fg">{stats.nextConstructionStage.name}</p>
              <Fact
                label="Planned Start"
                value={stats.nextConstructionStage.startDate ? formatDate(new Date(stats.nextConstructionStage.startDate)) : "—"}
              />
            </div>
          )}
        </section>
      )}

      {(stats.currentGoal || stats.nextGoal) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stats.currentGoal && (
            <Link
              href={`/admin/finance/cost-allocations/${stats.currentGoal.id}`}
              className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:border-fg-subtle"
            >
              <p className="text-label text-fg-subtle uppercase">Current Construction Goal</p>
              <div className="flex items-center justify-between">
                <p className="text-h4 text-fg">{stats.currentGoal.title}</p>
                <StatusBadge status={stats.currentGoal.status} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Fact label="Target" value={formatBDT(stats.currentGoal.target)} />
                <Fact label="Collected" value={formatBDT(stats.currentGoal.collected)} />
                <Fact label="Progress" value={`${stats.currentGoal.collectionPercent}%`} />
              </div>
            </Link>
          )}
          {stats.nextGoal && (
            <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-lg border border-dashed p-4">
              <p className="text-label text-fg-subtle uppercase">Next Goal</p>
              <p className="text-h4 text-fg">{stats.nextGoal.title}</p>
              <Fact label="Target" value={formatBDT(stats.nextGoal.target)} />
            </div>
          )}
        </section>
      )}

      <DashboardSection title="Financial Overview">
        {stats.contributionsPayable === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="No cost allocations yet"
              description="Owner contributions raised against this project will be summarized here."
              action={
                <Link href="/admin/finance/cost-allocations/new" className="text-body-sm text-accent font-medium hover:underline">
                  Create Cost Allocation
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <KpiCard label="Payable" value={stats.contributionsPayable} formatValue={formatBDT} />
            <KpiCard label="Paid" value={stats.contributionsPaid} formatValue={formatBDT} />
            <KpiCard
              label="Outstanding"
              value={stats.contributionsOutstanding}
              formatValue={formatBDT}
              status={stats.contributionsOutstanding > 0 ? "warning" : "success"}
            />
          </>
        )}
      </DashboardSection>

      <DashboardSection title="Materials Overview">
        {stats.materialsTrackedCount === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState
              title="No stock movements recorded yet"
              description="This project's material inventory will appear here once tracked."
              action={
                <Link href={`/admin/projects/${id}/materials`} className="text-body-sm text-accent font-medium hover:underline">
                  <AdminText>{"Record Movement"}</AdminText>
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <KpiCard label="Materials Tracked" value={stats.materialsTrackedCount} />
            <KpiCard label="Purchase Cost" value={stats.materialPurchaseCost} formatValue={formatBDT} />
            <KpiCard
              label="Low Stock"
              value={stats.lowStockMaterialCount}
              status={stats.lowStockMaterialCount > 0 ? "error" : "success"}
            />
          </>
        )}
      </DashboardSection>

      {recentAssignments.length > 0 && (
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Recent Assignments</h2>
          <div className="flex flex-col gap-2">
            {recentAssignments.map((row) => (
              <div key={row.id} className="border-border flex items-center justify-between border-b py-2 last:border-b-0">
                <p className="text-body-sm text-fg">
                  {row.ownerLabel} → {row.targetLabel}
                </p>
                <p className="text-caption text-fg-subtle">{row.startDate.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          {project.media.coverImage ? (
            <Media
              src={project.media.coverImage}
              alt={project.name}
              ratio="standard"
              radius="lg"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
          ) : (
            <div className="border-border bg-surface text-fg-subtle flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed">
              <p className="text-body-sm">No cover image yet</p>
            </div>
          )}

          <div className="border-border bg-surface-raised grid grid-cols-2 gap-4 rounded-lg border p-4">
            <Fact label="Code" value={project.code} />
            <Fact label="Slug" value={project.slug} />
            <Fact label="Property Type" value={project.propertyType} />
            <Fact label="Sales Status" value={project.salesStatus} />
            <Fact label="Buildings" value={String(project.buildingCount)} />
            <Fact label="Floors" value={String(project.floorCount)} />
            <Fact label="Units" value={String(project.unitCount)} />
            <Fact label="Published" value={project.isPublished ? "Yes" : "No"} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Location"}</AdminText></h2>
            <p className="text-body text-fg flex items-start gap-2">
              <MapPin aria-hidden className="text-fg-subtle mt-0.5 size-4 shrink-0" />
              <span>
                {project.address}
                {project.area ? `, ${project.area}` : ""}, {project.city}
                {project.postalCode ? ` ${project.postalCode}` : ""}
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Description"}</AdminText></h2>
            <p className="text-body text-fg-muted whitespace-pre-line">{project.description}</p>
          </section>

          {project.amenities.length > 0 && (
            <section>
              <h2 className="text-label text-fg-subtle mb-2 uppercase">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {project.amenities.map((amenity) => (
                  <span key={amenity} className="text-caption bg-surface rounded px-2.5 py-1">
                    {amenity}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Timeline"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact label="Launch" value={project.launchDate ? formatDate(new Date(project.launchDate)) : "—"} />
              <Fact
                label="Construction Start"
                value={project.constructionStartDate ? formatDate(new Date(project.constructionStartDate)) : "—"}
              />
              <Fact
                label="Expected Completion"
                value={project.expectedCompletionDate ? formatDate(new Date(project.expectedCompletionDate)) : "—"}
              />
              <Fact label="Handover" value={project.handoverDate ? formatDate(new Date(project.handoverDate)) : "—"} />
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(project.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(project.updatedAt))} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
