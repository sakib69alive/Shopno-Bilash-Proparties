import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatBDT } from "@/lib/format";
import { getMonthlyCashFlow } from "@/features/reports/financeReports";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/** Prompt 6 §9/§11 — Monthly Cash Flow: received vs spent, in/out only, never labelled as profit (see `getMonthlyCashFlow`'s doc comment). Optionally scoped to one project via `?projectId=`. */
export default async function CashFlowReportPage({ searchParams }: PageProps) {
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
    rows = await getMonthlyCashFlow(user, projectId);
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
        title="Monthly Cash Flow"
        description="Received vs. spent, month by month — an in/out ledger, not a profit/loss statement."
        breadcrumbs={[{ label: "Reports", href: "/admin/finance/reports" }, { label: "Cash Flow" }]}
      />
      <div className="p-4 sm:p-6">
        <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border text-label text-fg-subtle border-b uppercase">
                <th className="px-4 py-3 font-normal">Month</th>
                <th className="px-4 py-3 text-right font-normal">Received</th>
                <th className="px-4 py-3 text-right font-normal">Spent</th>
                <th className="px-4 py-3 text-right font-normal">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-border text-body-sm border-b last:border-b-0">
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(row.received)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(row.spent)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${row.net >= 0 ? "text-success" : "text-error"}`}>
                    {row.net >= 0 ? "+" : ""}
                    {formatBDT(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
