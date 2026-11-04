import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { formatBDT, formatDate } from "@/lib/format";
import { getContractorPaymentReport } from "@/features/reports/financeReports";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/** Prompt 6 §11 — Contractor Payment Report, optionally scoped to one project via `?projectId=`. */
export default async function ContractorPaymentReportPage({ searchParams }: PageProps) {
  const { projectId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reports." />
      </div>
    );
  }

  let rows;
  try {
    rows = await getContractorPaymentReport(user, projectId);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This report couldn't be loaded. Please try again." />
      </div>
    );
  }

  const total = rows.reduce((s, r) => s + r.payment.amount.amount, 0);

  return (
    <>
      <AdminPageHeader
        title="Contractor Payment Report"
        breadcrumbs={[{ label: "Reports", href: "/admin/finance/reports" }, { label: "Contractor Payments" }]}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <DashboardSection title="Summary">
          <KpiCard label="Total Paid" value={total} formatValue={formatBDT} />
          <KpiCard label="Payments Recorded" value={rows.length} />
        </DashboardSection>

        {rows.length === 0 ? (
          <EmptyState title="No contractor payments yet" description="Payments recorded against contractors will appear here." />
        ) : (
          <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-3 font-normal">Contractor</th>
                  <th className="px-4 py-3 font-normal">Project</th>
                  <th className="px-4 py-3 text-right font-normal">Amount</th>
                  <th className="px-4 py-3 font-normal">Date</th>
                  <th className="px-4 py-3 font-normal">Reference</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ payment, contractorName, projectName }) => (
                  <tr key={payment.id} className="border-border text-body-sm border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/admin/construction/contractors/${payment.contractorId}`} className="text-fg hover:text-accent transition-colors">
                        {contractorName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{projectName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBDT(payment.amount.amount)}</td>
                    <td className="px-4 py-3 text-fg-muted">{formatDate(new Date(payment.date))}</td>
                    <td className="px-4 py-3 text-fg-subtle">{payment.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
