import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { canAccessProject } from "@/lib/projectScope";
import {
  costAllocationRepository,
  ownerContributionRepository,
  unitAllocationRepository,
  contributionAdjustmentRepository,
} from "@/features/costAllocations/repository";
import { computeContributionState } from "@/lib/contributionStatus";
import { formatBDT } from "@/lib/format";
import { OwnerFinancialDrilldown } from "@/components/admin/projects/OwnerFinancialDrilldown";
import type { OwnerType } from "@/types/finance/costAllocation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * A read-only aggregation across three still-separate entity types — not a
 * step toward unifying the Owner model (deliberately out of scope for this
 * pass). Gated on "any of" the three view permissions, so a single-domain
 * role (e.g. sales) still sees the Customer section even without
 * `shareholder.view`/`landowner.view`.
 */
export default async function ProjectOwnersPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasAnyPermission(user.role, ["customer.view", "shareholder.view", "landowner.view"])) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Owners." />
      </div>
    );
  }

  const canSeeCustomers = hasPermission(user.role, "customer.view");
  const canSeeShareholders = hasPermission(user.role, "shareholder.view");
  const canSeeLandowners = hasPermission(user.role, "landowner.view");
  const canSeeFinance = hasPermission(user.role, "finance.view");

  interface FinancialSummary {
    payable: number;
    paid: number;
    outstanding: number;
    fine: number;
    drilldown: { goalTitle: string; unitNumber: string; payableAmount: number }[];
  }

  let project, customerOwners, shareholderOwners, landownerOwners;
  const financialByOwner = new Map<string, FinancialSummary>();
  try {
    project = await projectRepository.findById(id);
    if (project) {
      const [units, customers, shareholders, shareholdings, landowners, agreements] = await Promise.all([
        unitRepository.list(),
        canSeeCustomers ? customerRepository.list() : Promise.resolve([]),
        canSeeShareholders ? shareholderRepository.list() : Promise.resolve([]),
        canSeeShareholders ? shareholdingRepository.list() : Promise.resolve([]),
        canSeeLandowners ? landownerRepository.list() : Promise.resolve([]),
        canSeeLandowners ? agreementRepository.list() : Promise.resolve([]),
      ]);

      if (canSeeFinance) {
        const [allAllocations, allContributions, allUnitAllocations, allAdjustments] = await Promise.all([
          costAllocationRepository.list(),
          ownerContributionRepository.list(),
          unitAllocationRepository.list(),
          contributionAdjustmentRepository.list(),
        ]);
        const allocations = allAllocations.filter((a) => a.projectId === id);
        const allocationsById = new Map(allocations.map((a) => [a.id, a]));
        const contributions = allContributions.filter((c) => allocationsById.has(c.costAllocationId));

        for (const contribution of contributions) {
          const allocation = allocationsById.get(contribution.costAllocationId)!;
          const ownAdjustments = allAdjustments.filter((adj) => adj.contributionId === contribution.id);
          const state = computeContributionState(contribution, allocation, ownAdjustments);
          const key = `${contribution.ownerType}:${contribution.ownerId}`;
          const existing = financialByOwner.get(key) ?? { payable: 0, paid: 0, outstanding: 0, fine: 0, drilldown: [] };
          // effectivePayable (includes adjustments), matching `outstanding`
          // below — otherwise Payable - Paid stops equaling Outstanding
          // whenever this owner has a waiver/discount/correction on file.
          existing.payable += state.effectivePayable;
          existing.paid += contribution.paidAmount.amount;
          existing.outstanding += state.outstanding;
          existing.fine += state.fineAmount;
          for (const ua of allUnitAllocations.filter((u) => u.contributionId === contribution.id)) {
            const unit = units.find((u) => u.id === ua.unitId);
            existing.drilldown.push({ goalTitle: allocation.title, unitNumber: unit?.unitNumber ?? "—", payableAmount: ua.payableAmount.amount });
          }
          financialByOwner.set(key, existing);
        }
      }

      const projectUnits = units.filter((u) => u.projectId === id);
      const customersById = new Map(customers.map((c) => [c.id, c]));
      customerOwners = projectUnits
        .filter((u) => u.customerId)
        .map((u) => ({ unit: u, customer: customersById.get(u.customerId!) }))
        .filter((x): x is { unit: (typeof projectUnits)[number]; customer: NonNullable<typeof x.customer> } => !!x.customer);

      const shareholdersById = new Map(shareholders.map((s) => [s.id, s]));
      shareholderOwners = shareholdings
        .filter((s) => s.projectId === id)
        .map((s) => ({ shareholding: s, shareholder: shareholdersById.get(s.shareholderId) }))
        .filter((x): x is { shareholding: (typeof shareholdings)[number]; shareholder: NonNullable<typeof x.shareholder> } => !!x.shareholder);

      const landownersById = new Map(landowners.map((l) => [l.id, l]));
      landownerOwners = agreements
        .filter((a) => a.projectId === id)
        .map((a) => ({ agreement: a, landowner: landownersById.get(a.landownerId) }))
        .filter((x): x is { agreement: (typeof agreements)[number]; landowner: NonNullable<typeof x.landowner> } => !!x.landowner);
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Owners couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !customerOwners || !shareholderOwners || !landownerOwners) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const totalOwners = customerOwners.length + shareholderOwners.length + landownerOwners.length;

  if (totalOwners === 0) {
    return (
      <div className="p-4 sm:p-6">
        <EmptyState
          icon={Users}
          title="No owners linked to this project yet"
          description="Customers, shareholders, and landowners with a stake in this project will appear here."
          action={
            canSeeCustomers && (
              <Link href="/admin/customers/new" className="text-body-sm text-accent font-medium hover:underline">
                <AdminText>{"Add Customer"}</AdminText>
              </Link>
            )
          }
        />
      </div>
    );
  }

  function FinancialSummaryBlock({ ownerType, ownerId }: { ownerType: OwnerType; ownerId: string }) {
    if (!canSeeFinance) return null;
    const summary = financialByOwner.get(`${ownerType}:${ownerId}`);
    if (!summary) return null;
    return (
      <div className="mt-2 flex flex-col gap-1">
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          <p className="text-caption text-fg-subtle">
            Payable: <span className="text-fg">{formatBDT(summary.payable)}</span>
          </p>
          <p className="text-caption text-fg-subtle">
            Paid: <span className="text-fg">{formatBDT(summary.paid)}</span>
          </p>
          <p className="text-caption text-fg-subtle">
            Outstanding: <span className={summary.outstanding > 0 ? "text-warning" : "text-fg"}>{formatBDT(summary.outstanding)}</span>
          </p>
          {summary.fine > 0 && (
            <p className="text-caption text-fg-subtle">
              Fine: <span className="text-error">{formatBDT(summary.fine)}</span>
            </p>
          )}
        </div>
        <OwnerFinancialDrilldown rows={summary.drilldown} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {canSeeCustomers && (
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Customers ({customerOwners.length})</h2>
          {customerOwners.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No customer-owned units in this project.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {customerOwners.map(({ unit, customer }) => (
                <div key={unit.id} className="border-border bg-surface-raised rounded-lg border p-4">
                  <div>
                    <Link href={`/admin/customers/${customer.id}`} className="text-body-sm text-fg hover:text-accent font-medium transition-colors">
                      {customer.name}
                    </Link>
                    <p className="text-caption text-fg-subtle"><AdminText>{"Unit "}</AdminText>{unit.unitNumber}</p>
                  </div>
                  <FinancialSummaryBlock ownerType="customer" ownerId={customer.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {canSeeShareholders && (
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Shareholders ({shareholderOwners.length})</h2>
          {shareholderOwners.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No shareholders hold a stake in this project.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {shareholderOwners.map(({ shareholding, shareholder }) => (
                <div key={shareholding.id} className="border-border bg-surface-raised rounded-lg border p-4">
                  <div>
                    <Link
                      href={`/admin/shareholders/${shareholder.id}`}
                      className="text-body-sm text-fg hover:text-accent font-medium transition-colors"
                    >
                      {shareholder.name}
                    </Link>
                    <p className="text-caption text-fg-subtle">
                      {shareholding.sharePercentage}% · {shareholding.allocatedUnitIds.length} unit(s) allocated
                    </p>
                  </div>
                  <FinancialSummaryBlock ownerType="shareholder" ownerId={shareholder.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {canSeeLandowners && (
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Landowners ({landownerOwners.length})</h2>
          {landownerOwners.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No landowner agreements for this project.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {landownerOwners.map(({ agreement, landowner }) => (
                <div key={agreement.id} className="border-border bg-surface-raised rounded-lg border p-4">
                  <div>
                    <Link
                      href={`/admin/landowners/${landowner.id}`}
                      className="text-body-sm text-fg hover:text-accent font-medium transition-colors"
                    >
                      {landowner.name}
                    </Link>
                    <p className="text-caption text-fg-subtle">{agreement.termsSummary}</p>
                  </div>
                  <FinancialSummaryBlock ownerType="landowner" ownerId={landowner.id} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
