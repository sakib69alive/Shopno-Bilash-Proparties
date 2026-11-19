import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { getReportsSummary } from "@/features/reports/data";
import { formatBDT } from "@/lib/format";

/**
 * Admin Step 18 — Reports Foundation. Every figure is a live aggregate
 * over an existing repository (`features/reports/data.ts`) — reuses the
 * `KpiCard`/`DashboardSection` components Admin Step 4 already built
 * rather than a new visual language for "the same kind of number, on a
 * different page."
 */
export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reports." />
      </div>
    );
  }

  let summary;
  try {
    summary = await getReportsSummary(user);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Reports couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Reports"}</AdminText>}
        description={<AdminText>{"Every module's numbers, in one place — live, never a snapshot."}</AdminText>}
      />
      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <DashboardSection title="Development">
          <KpiCard label="Active Projects" value={summary.activeProjects} emptyLabel="No projects yet" />
          <KpiCard label="Properties / Units" value={summary.units} />
          <KpiCard label="Construction Phases" value={summary.constructionPhases} />
          <KpiCard
            label="Avg. Construction Progress"
            value={summary.averageConstructionProgress}
            formatValue={(v) => `${v}%`}
          />
        </DashboardSection>

        <DashboardSection title="Sales">
          <KpiCard label="Customers" value={summary.customers} />
          <KpiCard label="Sales Recorded" value={summary.sales} />
          <KpiCard label="Total Sales Value" value={summary.totalSalesValue} formatValue={formatBDT} />
          <KpiCard label="Leads / Enquiries" value={summary.leads} />
        </DashboardSection>

        <DashboardSection title="Finance">
          <KpiCard label="Payments Received" value={summary.totalPaymentsReceived} formatValue={formatBDT} />
          <KpiCard label="Expenses" value={summary.totalExpenses} formatValue={formatBDT} />
          <KpiCard label="Outstanding" value={summary.outstanding} formatValue={formatBDT} />
          <KpiCard label="Contractor Payments" value={summary.totalContractorPayments} formatValue={formatBDT} />
        </DashboardSection>

        <DashboardSection title="Construction Cost">
          <KpiCard label="Material Cost" value={summary.totalMaterialCost} formatValue={formatBDT} />
          <KpiCard label="Total Budget" value={summary.totalBudget} formatValue={formatBDT} />
          <KpiCard label="Actual Construction Cost" value={summary.totalActualConstructionCost} formatValue={formatBDT} />
          <KpiCard
            label="Budget Variance"
            value={summary.totalActualConstructionCost - summary.totalBudget}
            formatValue={(v) => `${v >= 0 ? "+" : ""}${formatBDT(v)}`}
            status={summary.totalActualConstructionCost > summary.totalBudget ? "warning" : "success"}
          />
        </DashboardSection>

        <DashboardSection title="Operations">
          <KpiCard label="Documents on File" value={summary.documents} />
        </DashboardSection>

        <div className="flex flex-col gap-2">
          {[
            { href: "/admin/finance/reports/owner-contributions", label: "Owner Contributions — who owes what, across every Cost Allocation" },
            { href: "/admin/finance/reports/categories", label: "Expense Category Report — totals by category, drilling into individual expenses" },
            { href: "/admin/finance/reports/contractor-payments", label: "Contractor Payment Report — every payment, by contractor and project" },
            { href: "/admin/finance/reports/cash-flow", label: "Monthly Cash Flow — received vs. spent, month by month" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-border hover:border-fg-subtle group flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <span className="text-body-sm flex-1 text-fg">{link.label}</span>
              <ArrowRight aria-hidden className="text-fg-subtle size-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
