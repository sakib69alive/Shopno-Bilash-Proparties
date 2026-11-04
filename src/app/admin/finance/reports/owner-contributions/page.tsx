import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/ui/Badge";
import { SendOverdueNoticesButton } from "@/components/admin/finance/SendOverdueNoticesButton";
import { formatBDT, formatDate } from "@/lib/format";
import { getOwnerContributionsReport } from "@/features/reports/ownerContributions";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";
import { projectRepository } from "@/features/projects/repository";
import type { OwnerType } from "@/types/finance/costAllocation";

const OWNER_ROUTE: Record<OwnerType, string> = {
  customer: "/admin/customers",
  shareholder: "/admin/shareholders",
  landowner: "/admin/landowners",
};

/**
 * Who owes what, across every Cost Allocation, in one place — the report
 * the flat KPI-tile Reports page can't show (it needs a per-owner table,
 * not a single aggregate number). Reuses `getOwnerContributionsReport`,
 * which reuses `computeContributionState` — one place paid/overdue/fine
 * logic lives, not re-derived here.
 */
export default async function OwnerContributionsReportPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reports." />
      </div>
    );
  }

  let report, ownerNames, projectsById;
  try {
    report = await getOwnerContributionsReport(user);
    const [customers, shareholders, landowners, projects] = await Promise.all([
      customerRepository.list(),
      shareholderRepository.list(),
      landownerRepository.list(),
      projectRepository.list(),
    ]);
    ownerNames = new Map<string, string>([
      ...customers.map((c): [string, string] => [`customer:${c.id}`, c.name]),
      ...shareholders.map((s): [string, string] => [`shareholder:${s.id}`, s.name]),
      ...landowners.map((l): [string, string] => [`landowner:${l.id}`, l.name]),
    ]);
    projectsById = new Map(projects.map((p) => [p.id, p]));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This report couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Owner Contributions"
        description="Who owes what, across every Cost Allocation — live, never a snapshot."
        breadcrumbs={[{ label: "Reports", href: "/admin/finance/reports" }, { label: "Owner Contributions" }]}
        secondaryActions={hasPermission(user.role, "notifications.manage") && report.overdueCount > 0 && <SendOverdueNoticesButton />}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <DashboardSection title="Summary">
          <KpiCard label="Total Payable" value={report.totalPayable} formatValue={formatBDT} />
          <KpiCard label="Total Paid" value={report.totalPaid} formatValue={formatBDT} />
          <KpiCard label="Total Outstanding" value={report.totalOutstanding} formatValue={formatBDT} status={report.totalOutstanding > 0 ? "warning" : "success"} />
          <KpiCard label="Fines Accrued" value={report.totalFines} formatValue={formatBDT} status={report.totalFines > 0 ? "error" : "success"} />
        </DashboardSection>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">
            Outstanding Contributions {report.overdueCount > 0 && `(${report.overdueCount} overdue)`}
          </h2>
          {report.outstandingRows.length === 0 ? (
            <EmptyState title="Nothing outstanding" description="Every generated contribution across every allocation has been fully paid." />
          ) : (
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-3 font-normal">Owner</th>
                    <th className="px-4 py-3 font-normal">Project</th>
                    <th className="px-4 py-3 font-normal">Allocation</th>
                    <th className="px-4 py-3 text-right font-normal">Outstanding</th>
                    <th className="px-4 py-3 text-right font-normal">Fine</th>
                    <th className="px-4 py-3 text-right font-normal">Total Due</th>
                    <th className="px-4 py-3 font-normal">Due Date</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.outstandingRows.map(({ contribution, allocation, outstanding, fineAmount, totalDue, status }) => (
                    <tr key={contribution.id} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`${OWNER_ROUTE[contribution.ownerType]}/${contribution.ownerId}`}
                          className="text-fg hover:text-accent transition-colors"
                        >
                          {ownerNames.get(`${contribution.ownerType}:${contribution.ownerId}`) ?? "Unknown owner"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{projectsById.get(contribution.projectId)?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/finance/cost-allocations/${allocation.id}`} className="text-fg-muted hover:text-accent transition-colors">
                          {allocation.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBDT(outstanding)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fineAmount > 0 ? formatBDT(fineAmount) : "—"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-fg">{formatBDT(totalDue)}</td>
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
      </div>
    </>
  );
}
