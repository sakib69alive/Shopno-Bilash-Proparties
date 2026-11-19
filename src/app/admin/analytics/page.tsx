import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DistributionBar } from "@/components/admin/analytics/DistributionBar";
import { getAnalyticsBreakdown } from "@/features/analytics/data";

/**
 * Admin Step 19 — Analytics Foundation. Gated on `reports.view` — there
 * is no separate `analytics` permission domain in `config/permissions.ts`
 * and this page is close enough in kind (a read-only computed view over
 * existing repositories) to Reports that inventing a second permission
 * for it isn't warranted. No web-traffic/page-view numbers are shown —
 * this project has no tracking pipeline for that; only the real business
 * distributions the existing repositories can answer.
 */
export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Analytics." />
      </div>
    );
  }

  let breakdown;
  try {
    breakdown = await getAnalyticsBreakdown(user);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Analytics couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Analytics"}</AdminText>}
        description={<AdminText>{"Real distributions across units, leads and customers — no web traffic tracking exists yet."}</AdminText>}
      />
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        <DistributionBar title="Units by Status" entries={breakdown.unitsByStatus} />
        <DistributionBar title="Leads by Status" entries={breakdown.leadsByStatus} />
        <DistributionBar title="Customers by Status" entries={breakdown.customersByStatus} />
        <DistributionBar title="Sales by Status" entries={breakdown.salesByStatus} />
        <DistributionBar title="Bookings by Status" entries={breakdown.bookingsByStatus} />
        <DistributionBar title="Construction Phases by Status" entries={breakdown.constructionPhasesByStatus} />
        <DistributionBar title="Parking by Status" entries={breakdown.parkingByStatus} />
      </div>
    </>
  );
}
