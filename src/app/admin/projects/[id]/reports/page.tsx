import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/ui/Badge";
import { FileBarChart } from "lucide-react";
import { formatBDT, formatDate } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import { costAllocationRepository, ownerContributionRepository, contributionAdjustmentRepository } from "@/features/costAllocations/repository";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";
import { computeContributionState } from "@/lib/contributionStatus";
import { getProjectWorkspaceStats } from "@/features/projects/workspaceStats";
import { getMonthlyCollectionSummary } from "@/features/costAllocations/monthlyCollection";
import { canAccessProject } from "@/lib/projectScope";
import type { OwnerType } from "@/types/finance/costAllocation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** This project's Owner Contributions detail — same computation `getOwnerContributionsReport` uses (`computeContributionState`), scoped to one project instead of a user's whole visible set via `getProjectWorkspaceStats`'s totals plus its own row-level detail here. */
export default async function ProjectReportsPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reports." />
      </div>
    );
  }

  let project, stats, outstandingRows, ownerNames, monthlyCollection;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      stats = await getProjectWorkspaceStats(id);
      monthlyCollection = await getMonthlyCollectionSummary(user, id);

      const [allocations, contributions, customers, shareholders, landowners, allAdjustments] = await Promise.all([
        costAllocationRepository.list(),
        ownerContributionRepository.list(),
        customerRepository.list(),
        shareholderRepository.list(),
        landownerRepository.list(),
        contributionAdjustmentRepository.list(),
      ]);
      const projectAllocations = allocations.filter((a) => a.projectId === id);
      const allocationsById = new Map(projectAllocations.map((a) => [a.id, a]));
      const projectContributions = contributions.filter((c) => allocationsById.has(c.costAllocationId));
      const adjustmentsByContribution = new Map<string, typeof allAdjustments>();
      for (const adjustment of allAdjustments) {
        const list = adjustmentsByContribution.get(adjustment.contributionId) ?? [];
        list.push(adjustment);
        adjustmentsByContribution.set(adjustment.contributionId, list);
      }

      ownerNames = new Map<string, string>([
        ...customers.map((c): [string, string] => [`customer:${c.id}`, c.name]),
        ...shareholders.map((s): [string, string] => [`shareholder:${s.id}`, s.name]),
        ...landowners.map((l): [string, string] => [`landowner:${l.id}`, l.name]),
      ]);

      outstandingRows = projectContributions
        .map((contribution) => {
          const allocation = allocationsById.get(contribution.costAllocationId)!;
          const state = computeContributionState(contribution, allocation, adjustmentsByContribution.get(contribution.id) ?? []);
          return { contribution, allocation, ...state };
        })
        .filter((row) => row.status !== "paid")
        .sort((a, b) => (a.status === "overdue" && b.status !== "overdue" ? -1 : b.totalDue - a.totalDue));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This report couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !stats || !outstandingRows || !ownerNames || !monthlyCollection) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const OWNER_ROUTE: Record<OwnerType, string> = {
    customer: "/admin/customers",
    shareholder: "/admin/shareholders",
    landowner: "/admin/landowners",
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <DashboardSection title="Summary">
        <KpiCard label="Total Payable" value={stats.contributionsPayable} formatValue={formatBDT} />
        <KpiCard label="Total Paid" value={stats.contributionsPaid} formatValue={formatBDT} />
        <KpiCard
          label="Total Outstanding"
          value={stats.contributionsOutstanding}
          formatValue={formatBDT}
          status={stats.contributionsOutstanding > 0 ? "warning" : "success"}
        />
      </DashboardSection>

      <DashboardSection title="Construction Finance">
        <KpiCard label="Budgeted" value={stats.costSummary.budgeted} formatValue={formatBDT} />
        <KpiCard label="Actual Cost" value={stats.costSummary.actualCost} formatValue={formatBDT} />
        <KpiCard
          label="Variance"
          value={stats.costSummary.variance}
          formatValue={(v) => `${v >= 0 ? "+" : ""}${formatBDT(v)}`}
          status={stats.costSummary.variance > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Budget Utilization"
          value={stats.costSummary.utilizationPct}
          formatValue={(v) => {
            const label =
              stats.costSummary.budgetStatus === "under" ? "Under Budget" : stats.costSummary.budgetStatus === "on" ? "On Budget" : "Over Budget";
            return `${v}% · ${label}`;
          }}
          emptyLabel="No Budget Set"
          status={
            stats.costSummary.budgetStatus === "over"
              ? "error"
              : stats.costSummary.budgetStatus === "on"
                ? "warning"
                : stats.costSummary.budgetStatus === "under"
                  ? "success"
                  : undefined
          }
        />
      </DashboardSection>

      <section>
        <h2 className="text-label text-fg-subtle mb-3 uppercase">Actual Cost Breakdown</h2>
        <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border text-label text-fg-subtle border-b uppercase">
                <th className="px-4 py-3 font-normal">Source</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border text-body-sm border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Link href="/admin/procurement/purchases" className="hover:text-accent transition-colors">
                    Material Purchases
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatBDT(stats.costSummary.materialCost)}</td>
              </tr>
              <tr className="border-border text-body-sm border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/finance/reports/contractor-payments?projectId=${project.id}`} className="hover:text-accent transition-colors">
                    Contractor Payments
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatBDT(stats.costSummary.contractorCost)}</td>
              </tr>
              <tr className="border-border text-body-sm border-b last:border-b-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/finance/expenses?projectId=${project.id}`} className="hover:text-accent transition-colors">
                    Other Expenses
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatBDT(stats.costSummary.otherExpenseCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-label text-fg-subtle mb-3 uppercase">
          Outstanding Contributions {stats.overdueContributionCount > 0 && `(${stats.overdueContributionCount} overdue)`}
        </h2>
        {outstandingRows.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="Nothing outstanding"
            description="Every generated contribution for this project has been fully paid."
          />
        ) : (
          <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-3 font-normal">Owner</th>
                  <th className="px-4 py-3 font-normal">Allocation</th>
                  <th className="px-4 py-3 text-right font-normal">Outstanding</th>
                  <th className="px-4 py-3 text-right font-normal">Total Due</th>
                  <th className="px-4 py-3 font-normal">Due Date</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {outstandingRows.map(({ contribution, allocation, outstanding, totalDue, status }) => (
                  <tr key={contribution.id} className="border-border text-body-sm border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`${OWNER_ROUTE[contribution.ownerType]}/${contribution.ownerId}`}
                        className="text-fg hover:text-accent transition-colors"
                      >
                        {ownerNames.get(`${contribution.ownerType}:${contribution.ownerId}`) ?? "Unknown owner"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">
                      <Link href={`/admin/finance/cost-allocations/${allocation.id}`} className="hover:text-accent transition-colors">
                        {allocation.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBDT(outstanding)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatBDT(totalDue)}</td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(new Date(contribution.dueDate))}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-label text-fg-subtle uppercase">Month-wise Collection</h2>
          <Link href={`/admin/finance/reports/cash-flow?projectId=${project.id}`} className="text-caption text-accent hover:text-accent-strong transition-colors">
            View full cash flow →
          </Link>
        </div>
        <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border text-label text-fg-subtle border-b uppercase">
                <th className="px-4 py-3 font-normal">Month</th>
                <th className="px-4 py-3 text-right font-normal">Expected</th>
                <th className="px-4 py-3 text-right font-normal">Collected</th>
                <th className="px-4 py-3 text-right font-normal">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {monthlyCollection.map((row) => (
                <tr key={row.month} className="border-border text-body-sm border-b last:border-b-0">
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(row.expected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(row.collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(Math.max(0, row.expected - row.collected))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
