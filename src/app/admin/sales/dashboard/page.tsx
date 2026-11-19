import { AdminText } from "@/components/admin/AdminLanguage";
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
import { getSalesDashboard } from "@/features/sales/dashboardData";

/** Prompt 8 §9 — Sales Dashboard, every KPI a live aggregate (see `getSalesDashboard`). */
export default async function SalesDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view the Sales Dashboard." />
      </div>
    );
  }

  let data;
  try {
    data = await getSalesDashboard(user);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="The dashboard couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Sales Dashboard"}</AdminText>} description={<AdminText>{"Leads, bookings, and sales — live, never a snapshot."}</AdminText>} />
      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <DashboardSection title="Pipeline">
          <KpiCard label="Active Leads" value={data.activeLeads} emptyLabel="No active leads" />
          <KpiCard label="Site Visits" value={data.siteVisits} />
          <KpiCard label="Active Bookings" value={data.activeBookings} />
          <KpiCard label="Pending Sales" value={data.pendingSales} />
        </DashboardSection>

        <DashboardSection title="Units">
          <KpiCard label="Available Units" value={data.availableUnits} />
          <KpiCard label="Sold Units" value={data.soldUnits} />
          <KpiCard label="Total Sales Value" value={data.totalSalesValue} formatValue={formatBDT} />
          <KpiCard
            label="Conversion Rate"
            value={data.conversionRatePct}
            formatValue={(v) => `${v}%`}
            emptyLabel="No closed leads yet"
          />
        </DashboardSection>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">
            Follow-ups — Today ({data.todaysFollowUps.length}) · Overdue ({data.overdueFollowUps.length}) · Upcoming (
            {data.upcomingFollowUps.length})
          </h2>
          {data.todaysFollowUps.length + data.overdueFollowUps.length + data.upcomingFollowUps.length === 0 ? (
            <EmptyState title="No follow-ups scheduled" description="Leads with a next follow-up date will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {[...data.overdueFollowUps, ...data.todaysFollowUps, ...data.upcomingFollowUps].map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-fg-subtle"
                >
                  <div>
                    <p className="text-body-sm text-fg">{lead.name}</p>
                    <p className="text-caption text-fg-subtle">{lead.phone}</p>
                  </div>
                  <p className="text-caption text-fg-subtle">{formatDate(new Date(lead.nextFollowUpAt!))}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase"><AdminText>{"Recent Activity"}</AdminText></h2>
          {data.recentActivity.length === 0 ? (
            <EmptyState title="No recent activity" description="Recent sales and bookings will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {data.recentActivity.map((row) => (
                <Link
                  key={`${row.kind}-${row.id}`}
                  href={row.href}
                  className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-fg-subtle"
                >
                  <p className="text-body-sm text-fg">{row.label}</p>
                  <p className="text-caption text-fg-subtle">{formatDate(new Date(row.date))}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
