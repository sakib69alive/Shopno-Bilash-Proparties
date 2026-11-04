import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { formatBDT } from "@/lib/format";
import { getUnitInventoryReport, getLeadConversionReport, getSalespersonPerformanceReport } from "@/features/reports/salesReports";
import type { UnitStatus } from "@/types/unit";

/**
 * Prompt 8 §11 — Unit Inventory / Leads-Conversion / Salesperson Performance
 * live here since they're genuinely new reports; the Sales and Bookings
 * "reports" the brief also asks for are already the existing
 * `/admin/sales` and `/admin/sales/bookings` list pages (full search/
 * filter over the real data) — linked below rather than duplicated.
 */
export default async function SalesReportsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reports." />
      </div>
    );
  }

  let inventory, conversion, performance;
  try {
    [inventory, conversion, performance] = await Promise.all([
      getUnitInventoryReport(user),
      getLeadConversionReport(user),
      getSalespersonPerformanceReport(user),
    ]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Reports couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Sales Reports" description="Unit inventory, lead conversion, and salesperson performance — live." />
      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          {[
            { href: "/admin/sales", label: "Sales Report — every recorded sale, with project/status filters" },
            { href: "/admin/sales/bookings", label: "Bookings Report — every reservation, with project/status filters" },
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

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Unit Inventory</h2>
          {inventory.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No units yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {inventory.map((row) => (
                <div key={row.projectId} className="border-border bg-surface-raised rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Link href={`/admin/projects/${row.projectId}`} className="text-body-sm text-fg hover:text-accent font-medium transition-colors">
                      {row.projectName}
                    </Link>
                    <p className="text-caption text-fg-subtle">{row.total} units</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(row.byStatus) as [UnitStatus, number][]).map(([status, count]) => (
                      <span key={status} className="flex items-center gap-1.5">
                        <StatusBadge status={status} />
                        <span className="text-caption text-fg-subtle">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">
            Leads / Conversion {conversion.conversionRatePct !== null && `— ${conversion.conversionRatePct}% win rate`}
          </h2>
          <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-3 font-normal">Stage</th>
                  <th className="px-4 py-3 text-right font-normal">Leads</th>
                </tr>
              </thead>
              <tbody>
                {conversion.funnel.map((row) => (
                  <tr key={row.status} className="border-border text-body-sm border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
                <tr className="text-body-sm">
                  <td className="px-4 py-3">
                    <StatusBadge status="lost" />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{conversion.lostCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Salesperson Performance</h2>
          {performance.length === 0 ? (
            <p className="text-body-sm text-fg-subtle">No leads or sales assigned to a salesperson yet.</p>
          ) : (
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-3 font-normal">Salesperson</th>
                    <th className="px-4 py-3 text-right font-normal">Leads</th>
                    <th className="px-4 py-3 text-right font-normal">Won</th>
                    <th className="px-4 py-3 text-right font-normal">Sales</th>
                    <th className="px-4 py-3 text-right font-normal">Sales Value</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((row) => (
                    <tr key={row.salespersonId} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-3">{row.salespersonName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.leadsAssigned}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.leadsWon}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.salesCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatBDT(row.salesValue)}</td>
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
