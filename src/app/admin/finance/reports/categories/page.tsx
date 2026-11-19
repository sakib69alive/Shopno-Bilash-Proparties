import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatBDT, formatDate } from "@/lib/format";
import { getExpenseCategoryReport } from "@/features/reports/financeReports";

/** Prompt 6 §11 — Category Report: every category's total, drilling down to the individual expenses that make it up (never a dead-end summary number). */
export default async function ExpenseCategoryReportPage() {
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
    rows = await getExpenseCategoryReport(user);
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
        title={<AdminText>{"Expense Category Report"}</AdminText>}
        breadcrumbs={[{ label: "Reports", href: "/admin/finance/reports" }, { label: "Categories", localize: true }]}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {rows.length === 0 ? (
          <EmptyState title="No expenses yet" description="Category totals will appear here once expenses are recorded." />
        ) : (
          rows.map((row) => (
            <section key={row.category} className="border-border bg-surface-raised rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-body text-fg font-medium">{row.category}</h2>
                <p className="text-body-sm text-fg-muted">
                  {formatBDT(row.total)} · {row.count} {row.count === 1 ? "expense" : "expenses"}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {row.expenses.map((e) => (
                  <div key={e.id} className="text-caption text-fg-subtle flex items-center justify-between gap-3">
                    <span>
                      {e.description} — {formatDate(new Date(e.date))}
                    </span>
                    <span className="tabular-nums">{formatBDT(e.amount.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
