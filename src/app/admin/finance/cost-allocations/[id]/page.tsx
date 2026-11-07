import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { GenerateContributionsButton } from "@/components/admin/finance/GenerateContributionsButton";
import { AllocationPreviewTable } from "@/components/admin/finance/AllocationPreviewTable";
import { GoalInstallmentPlanForm } from "@/components/admin/finance/GoalInstallmentPlanForm";
import { TierAllocationBuilder } from "@/components/admin/finance/TierAllocationBuilder";
import { GoalLifecycleActions } from "@/components/admin/finance/GoalLifecycleActions";
import { ContributionsList, type ContributionRow } from "@/components/admin/finance/ContributionsList";
import { formatBDT, formatDate } from "@/lib/format";
import {
  computeContributionState,
  computeInstallmentObligationState,
  deriveGoalCollectionStatus,
} from "@/lib/contributionStatus";
import { computeGoalCollectionStats } from "@/features/costAllocations/goalStats";
import { resolveAllocationMethod } from "@/features/costAllocations/allocationMethods";
import {
  costAllocationRepository,
  ownerContributionRepository,
  contributionPaymentRepository,
  unitAllocationRepository,
  goalInstallmentRepository,
  ownerInstallmentObligationRepository,
  contributionAdjustmentRepository,
  unitTierRepository,
} from "@/features/costAllocations/repository";
import { recordContributionPayment, previewContributions, type AllocationPreview } from "@/features/costAllocations/actions";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { parkingRepository } from "@/features/parking/repository";
import { floorRepository } from "@/features/floors/repository";
import { SplitPlanner } from "@/components/admin/finance/SplitPlanner";
import { landownerAllocationRepository } from "@/features/landowners/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { canAccessProject } from "@/lib/projectScope";
import type { GoalInstallment, UnitTier } from "@/types/finance/costAllocation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notified?: string; withoutApp?: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

export default async function CostAllocationDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { notified, withoutApp } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this allocation." />
      </div>
    );
  }

  const allocation = await costAllocationRepository.findById(id);
  if (!allocation) notFound();
  if (!canAccessProject(user, allocation.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This allocation belongs to a project you don't have access to." />
      </div>
    );
  }

  let project,
    contributionRows: ContributionRow[],
    draftPreview: AllocationPreview | { error: string } | null = null,
    editableUnits: { id: string; unitNumber: string; ownerLabel: string; ownerHref?: string; sizeSqft: number; floorLabel: string; floorNumber: number }[] = [],
    editableParking: { id: string; parkingNumber: string; ownerLabel: string }[] = [],
    tiers: UnitTier[] = [],
    installments: GoalInstallment[] | undefined,
    goalStats,
    extraRows: { ownerName: string; paid: number; base: number; extra: number }[] = [];
  try {
    project = await projectRepository.findById(allocation.projectId);

    const [allContributions, allUnits, allAdjustments, allUnitAllocations, allInstallments, allObligations, allPayments] =
      await Promise.all([
        ownerContributionRepository.list(),
        unitRepository.list(),
        contributionAdjustmentRepository.list(),
        unitAllocationRepository.list(),
        goalInstallmentRepository.list(),
        ownerInstallmentObligationRepository.list(),
        contributionPaymentRepository.list(),
      ]);

    const contributions = allContributions.filter((c) => c.costAllocationId === id);
    const unitsById = new Map(allUnits.map((u) => [u.id, u]));
    installments = allInstallments.filter((i) => i.costAllocationId === id).sort((a, b) => a.installmentNumber - b.installmentNumber);
    const adjustments = allAdjustments.filter((a) => contributions.some((c) => c.id === a.contributionId));

    goalStats = computeGoalCollectionStats(allocation, contributions, adjustments);

    contributionRows = await Promise.all(
      contributions.map(async (contribution) => {
        const ownAdjustments = adjustments.filter((a) => a.contributionId === contribution.id);
        const state = computeContributionState(contribution, allocation, ownAdjustments);
        const resolved = await resolveDocumentOwner(contribution.ownerType, contribution.ownerId);
        const unitBreakdown = allUnitAllocations
          .filter((ua) => ua.contributionId === contribution.id)
          .map((ua) => ({ unitNumber: unitsById.get(ua.unitId)?.unitNumber ?? "—", payableAmount: ua.payableAmount.amount }));

        const ownObligations = allObligations.filter((o) => o.contributionId === contribution.id);
        const installmentOptions =
          ownObligations.length > 0
            ? ownObligations.map((obligation) => {
                const installment = installments!.find((i) => i.id === obligation.goalInstallmentId)!;
                const paid = allPayments
                  .filter((p) => p.installmentObligationId === obligation.id)
                  .reduce((s, p) => s + p.amount.amount, 0);
                const obligationState = computeInstallmentObligationState(obligation, installment, paid);
                return { id: obligation.id, label: installment.label, dueDate: installment.dueDate, outstanding: obligationState.outstanding };
              })
            : undefined;

        return {
          contributionId: contribution.id,
          ownerType: contribution.ownerType,
          ownerName: resolved.label,
          ownerHref: resolved.href,
          units: contribution.unitIds.map((uid) => unitsById.get(uid)?.unitNumber).filter((u): u is string => !!u),
          unitBreakdown,
          sizeSqft: contribution.unitSizeSqft,
          shareRatio: contribution.shareRatio,
          payableAmount: contribution.payableAmount.amount,
          paidAmount: contribution.paidAmount.amount,
          effectivePayable: state.effectivePayable,
          outstanding: state.outstanding,
          fineAmount: state.fineAmount,
          totalDue: state.totalDue,
          status: state.status,
          dueDate: contribution.dueDate,
          adjustments: ownAdjustments,
          installmentOptions,
        };
      }),
    );

    // Budget raised "on top": who was given more or less than the normal share.
    if (allocation.originalAmount) {
      extraRows = contributions
        .filter((c) => c.baseAmount && c.payableAmount.amount !== c.baseAmount.amount)
        .map((c) => ({
          ownerName: contributionRows.find((r) => r.contributionId === c.id)?.ownerName ?? "—",
          paid: c.payableAmount.amount,
          base: c.baseAmount!.amount,
          extra: c.payableAmount.amount - c.baseAmount!.amount,
        }))
        .sort((a, b) => b.extra - a.extra);
    }

    if (allocation.status === "draft") {
      const method = resolveAllocationMethod(allocation.allocationMethod);
      if (method === "fixed-unit" || method === "custom" || method === "tier") {
        const projectUnits = allUnits.filter((u) => u.projectId === allocation.projectId);
        const floorsById = new Map((await floorRepository.list()).map((fl) => [fl.id, fl]));
        const resolvedUnits = await Promise.all(
          projectUnits.map(async (unit) => {
            let ownerLabel = "Unowned (excluded)";
            let ownerHref: string | undefined;
            if (unit.customerId) {
              const resolved = await resolveDocumentOwner("customer", unit.customerId);
              ownerLabel = resolved.label;
              ownerHref = resolved.href;
            } else if (unit.shareholderId) {
              const resolved = await resolveDocumentOwner("shareholder", unit.shareholderId);
              ownerLabel = resolved.label;
              ownerHref = resolved.href;
            } else if (unit.landownerAllocationId) {
              const landownerAllocation = await landownerAllocationRepository.findById(unit.landownerAllocationId);
              if (landownerAllocation) {
                const resolved = await resolveDocumentOwner("landowner", landownerAllocation.landownerId);
                ownerLabel = resolved.label;
                ownerHref = resolved.href;
              }
            }
            return { id: unit.id, unitNumber: unit.unitNumber, ownerLabel, ownerHref, sizeSqft: unit.sizeSqft, floorLabel: floorsById.get(unit.floorId)?.label ?? "Flats", floorNumber: floorsById.get(unit.floorId)?.floorNumber ?? 0, owned: ownerLabel !== "Unowned (excluded)" };
          }),
        );
        editableUnits = resolvedUnits.filter((u) => u.owned);

        if (allocation.includeParkingInAllocation || method === "custom" || method === "fixed-unit") {
          const projectParking = (await parkingRepository.list()).filter((p) => p.projectId === allocation.projectId && p.ownerType && p.ownerId);
          editableParking = await Promise.all(
            projectParking.map(async (p) => ({
              id: p.id,
              parkingNumber: p.parkingNumber,
              ownerLabel: (await resolveDocumentOwner(p.ownerType!, p.ownerId!)).label,
            })),
          );
        }

        if (method === "tier") {
          tiers = (await unitTierRepository.list()).filter((t) => t.costAllocationId === id);
          draftPreview = await previewContributions(id);
        }
      } else {
        draftPreview = await previewContributions(id);
      }
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This allocation couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");
  const boundPaymentAction = recordContributionPayment.bind(null, allocation.id);
  const goalStatus = deriveGoalCollectionStatus(allocation, goalStats.collectionPercent);
  const method = resolveAllocationMethod(allocation.allocationMethod);

  return (
    <>
      <AdminPageHeader
        title={allocation.title}
        breadcrumbs={[{ label: "Cost Allocations", href: "/admin/finance/cost-allocations" }, { label: allocation.title }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={goalStatus} />
            {canManage && allocation.status === "generated" && (
              <GoalLifecycleActions
                costAllocationId={allocation.id}
                showMarkCompleted={goalStatus === "fully-funded"}
                isArchived={!!allocation.archivedAt}
              />
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        {notified !== undefined && (
          <div role="status" className="bg-success-soft text-success text-body-sm rounded-md px-4 py-3 lg:col-span-2">
            Saved. {notified} client{notified === "1" ? "" : "s"} {notified === "1" ? "has" : "have"} been sent the amount and due date in their app.
            {Number(withoutApp) > 0 &&
              ` ${withoutApp} owner${withoutApp === "1" ? " has" : "s have"} no app access yet — copy their link from the Customers list and send it on WhatsApp.`}
          </div>
        )}
        {allocation.status === "draft" && (
          <div className="bg-accent-soft text-fg rounded-xl px-4 py-4 lg:col-span-2">
            <p className="text-body">
              Collect <span className="font-semibold">{formatBDT(allocation.totalAmount.amount)}</span> for{" "}
              <span className="font-semibold">{allocation.title}</span>
              {project ? <> in {project.name}</> : null}, to be paid by{" "}
              <span className="font-semibold">{formatDate(new Date(allocation.dueDate))}</span>.
            </p>
            <p className="text-body-sm text-fg-muted mt-1">Choose who pays below. Nothing is sent to anyone until you press Save.</p>
          </div>
        )}
        <section className={"border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4" + (allocation.status === "draft" ? " hidden" : "")}>
          <h2 className="text-label text-fg-subtle uppercase">Allocation</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-caption text-fg-subtle uppercase">Project</p>
              {project ? (
                <Link href={`/admin/projects/${project.id}`} className="text-body-sm text-accent hover:text-accent-strong mt-0.5 block transition-colors">
                  {project.name}
                </Link>
              ) : (
                <p className="text-body-sm text-fg mt-0.5">—</p>
              )}
            </div>
            <Fact label="Category" value={allocation.category} />
            <Fact label="Total Amount" value={formatBDT(allocation.totalAmount.amount)} />
            <Fact label="Allocation Date" value={formatDate(new Date(allocation.allocationDate))} />
            <Fact label="Due Date" value={formatDate(new Date(allocation.dueDate))} />
            <Fact
              label="Fine Rule"
              value={allocation.fineType === "flat" ? `${formatBDT(allocation.fineValue)} flat` : `${allocation.fineValue}% of outstanding`}
            />
            <Fact
              label="Allocation Method"
              value={
                method === "sqft"
                  ? "Area / Square Feet"
                  : method === "unit-ratio"
                    ? "Predefined Unit Ratio"
                    : method === "fixed-unit"
                      ? "Fixed Amount per Unit"
                      : method === "tier"
                        ? "Tiered Groups (Custom)"
                        : "Fully Custom per Unit"
              }
            />
            {allocation.linkedExpenseId && <Fact label="Linked Expense" value="View →" />}
          </div>
        </section>

        {allocation.status === "draft" && canManage && method !== "tier" && (
          <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4 lg:col-span-2">
            <h2 className="text-label text-fg-subtle uppercase">Who pays how much?</h2>
            {method === "fixed-unit" || method === "custom" ? (
              editableUnits.length === 0 ? (
                <p className="text-body-sm text-fg-subtle">No owned units found in this project — nothing to allocate.</p>
              ) : (
                <SplitPlanner
                  costAllocationId={allocation.id}
                  totalAmount={allocation.totalAmount.amount}
                  units={editableUnits}
                  parkingSpaces={editableParking}
                  defaultBasis={method === "fixed-unit" ? "equal" : "sqft"}
                />
              )
            ) : draftPreview && "error" in draftPreview ? (
              <p className="text-body-sm text-error">{draftPreview.error}</p>
            ) : draftPreview ? (
              <>
                <AllocationPreviewTable preview={draftPreview} totalAmount={allocation.totalAmount.amount} />
                <div>
                  <GenerateContributionsButton costAllocationId={allocation.id} />
                </div>
              </>
            ) : null}
          </section>
        )}
      </div>

      {allocation.status === "draft" && canManage && method === "tier" && (
        <div className="p-4 sm:p-6 pt-0">
          <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
            <h2 className="text-label text-fg-subtle uppercase">Generate Contributions — Tiered Groups</h2>
            {editableUnits.length === 0 ? (
              <p className="text-body-sm text-fg-subtle">No owned units found in this project — nothing to allocate.</p>
            ) : (
              <TierAllocationBuilder
                costAllocationId={allocation.id}
                totalAmount={allocation.totalAmount.amount}
                units={editableUnits}
                tiers={tiers}
                preview={draftPreview}
                parkingSpaces={editableParking}
              />
            )}
          </section>
        </div>
      )}

      {allocation.status === "generated" && (
        <>
          <div className="p-4 sm:p-6 pt-0">
            <DashboardSection title="Collection Dashboard">
              <KpiCard label="Target" value={goalStats.target} formatValue={formatBDT} />
              <KpiCard label="Allocated" value={goalStats.allocated} formatValue={formatBDT} />
              <KpiCard label="Collected" value={goalStats.collected} formatValue={formatBDT} />
              <KpiCard
                label="Outstanding"
                value={goalStats.outstanding}
                formatValue={formatBDT}
                status={goalStats.outstanding > 0 ? "warning" : "success"}
              />
              <KpiCard label="Collection %" value={goalStats.collectionPercent} formatValue={(v) => `${v}%`} />
              <KpiCard label="Fully Paid Owners" value={goalStats.ownerCounts.fullyPaid} />
              <KpiCard label="Partial" value={goalStats.ownerCounts.partial} status={goalStats.ownerCounts.partial > 0 ? "warning" : "success"} />
              <KpiCard label="Unpaid" value={goalStats.ownerCounts.unpaid} status={goalStats.ownerCounts.unpaid > 0 ? "error" : "success"} />
            </DashboardSection>
          </div>

          {allocation.originalAmount && (
            <div className="p-4 sm:p-6 pt-0">
              <DashboardSection title="Budget — planned vs. now">
                <KpiCard label="Budget as planned" value={allocation.originalAmount.amount} formatValue={formatBDT} />
                <KpiCard
                  label={allocation.totalAmount.amount >= allocation.originalAmount.amount ? "Extra on top" : "Taken off"}
                  value={Math.abs(allocation.totalAmount.amount - allocation.originalAmount.amount)}
                  formatValue={formatBDT}
                  status={allocation.totalAmount.amount > allocation.originalAmount.amount ? "warning" : "success"}
                />
                <KpiCard label="New total" value={allocation.totalAmount.amount} formatValue={formatBDT} />
                <KpiCard label="Average per owner" value={contributionRows.length > 0 ? Math.round(allocation.totalAmount.amount / contributionRows.length) : 0} formatValue={formatBDT} />
              </DashboardSection>
              {extraRows.length > 0 && (
                <div className="border-border bg-surface-raised mt-4 rounded-lg border p-4">
                  <h3 className="text-label text-fg-subtle mb-2 uppercase">Who paid more or less than the normal share</h3>
                  <ul className="flex flex-col gap-1.5">
                    {extraRows.map((r) => {
                      const avg = contributionRows.length > 0 ? Math.round(allocation.totalAmount.amount / contributionRows.length) : 0;
                      return (
                        <li key={r.ownerName + r.paid} className="bg-surface flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 rounded-lg px-3 py-2">
                          <span className="text-body-sm font-semibold">{r.ownerName}</span>
                          <span className="text-body-sm tabular-nums">
                            pays {formatBDT(r.paid)} <span className="text-fg-subtle">(normal {formatBDT(r.base)})</span>{" "}
                            <span className={r.extra > 0 ? "text-warning font-semibold" : "text-success font-semibold"}>
                              {r.extra > 0 ? "+" : "−"}
                              {formatBDT(Math.abs(r.extra))}
                            </span>{" "}
                            <span className="text-fg-subtle">· {r.paid >= avg ? "above" : "below"} the {formatBDT(avg)} average by {formatBDT(Math.abs(r.paid - avg))}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-body-sm text-fg-muted mt-3">
                    Together they paid {formatBDT(extraRows.reduce((sum, r) => sum + r.extra, 0))} {extraRows.reduce((sum, r) => sum + r.extra, 0) >= 0 ? "extra" : "less"} — that is exactly what the budget moved by.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="p-4 sm:p-6 pt-0">
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Installment Plan</h2>
            {installments && installments.length === 0 ? (
              canManage ? (
                <GoalInstallmentPlanForm costAllocationId={allocation.id} />
              ) : (
                <EmptyState title="No installment plan yet" description="This goal is payable as one lump sum until a plan is created." />
              )
            ) : (
              <div className="flex flex-col gap-2">
                {installments?.map((installment) => (
                  <div key={installment.id} className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-body-sm text-fg font-medium">{installment.label}</p>
                      <p className="text-caption text-fg-subtle">Due {formatDate(new Date(installment.dueDate))}</p>
                    </div>
                    <p className="text-body-sm text-fg-muted">
                      {installment.amountMode === "percentage" ? `${installment.amountValue}%` : formatBDT(installment.amountValue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 pt-0">
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Owner Contributions</h2>
            <ContributionsList
              costAllocationId={allocation.id}
              rows={contributionRows}
              canManage={canManage}
              boundPaymentAction={boundPaymentAction}
            />
          </div>
        </>
      )}
    </>
  );
}
