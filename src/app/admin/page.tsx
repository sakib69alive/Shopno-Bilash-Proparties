import Link from "next/link";
import { Building2, FileText, HardHat, Images, Link2, ListPlus, Megaphone, Newspaper, PlusCircle, ReceiptText, SplitSquareVertical, UserCog, UserPlus, UsersRound, Wallet, ArrowRight } from "lucide-react";
import { TaskTile } from "@/components/admin/dashboard/TaskTile";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { QuickAction } from "@/components/admin/dashboard/QuickAction";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { StatusBadge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getDashboardData, getRecentActivity } from "@/features/dashboard/data";
import { computeSystemAlerts, summarizeAlerts } from "@/features/alerts/engine";
import { reminderRepository } from "@/features/reminders/repository";
import { canAccessProjectOptional } from "@/lib/projectScope";
import { formatDate, formatBDT } from "@/lib/format";

/**
 * The Admin landing page (Admin Step 4) — every number on it comes from
 * `features/dashboard/data.ts`'s `getDashboardData()`/`getRecentActivity()`,
 * never hardcoded here. Wrapped in try/catch (brief §11): if a future,
 * real (async, over-the-network) data source fails, this renders the
 * existing `ErrorState` rather than crashing the whole Admin shell — with
 * today's in-memory repositories this branch can't actually trigger, but
 * the page is built to survive it once it can.
 */
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  // AdminLayout already guarantees `user` exists and is staff by the time
  // this renders — this is just to satisfy the type, not a second gate.
  if (!user) return null;

  let data;
  let activity;
  let alerts;
  let todaysReminders;
  try {
    const [dashboardData, recentActivity, systemAlerts, allReminders] = await Promise.all([
      getDashboardData(user),
      getRecentActivity(),
      hasPermission(user.role, "alerts.view") ? computeSystemAlerts(user) : Promise.resolve([]),
      hasPermission(user.role, "reminders.view") ? reminderRepository.list() : Promise.resolve([]),
    ]);
    data = dashboardData;
    activity = recentActivity;
    alerts = systemAlerts;
    const todayStr = new Date().toISOString().slice(0, 10);
    todaysReminders = allReminders.filter(
      (r) => r.status === "pending" && r.date.slice(0, 10) <= todayStr && canAccessProjectOptional(user, r.projectId),
    );
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Dashboard data couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canCreateContent = hasPermission(user.role, "content.create");
  const canViewLeads = hasPermission(user.role, "lead.view");
  const canCreateProject = hasPermission(user.role, "project.create");
  const canManageUnits = hasPermission(user.role, "unit.manage");
  const canCreateCustomer = hasPermission(user.role, "customer.create");
  const canManageFinance = hasPermission(user.role, "finance.manage");
  const canManageConstruction = hasPermission(user.role, "construction.manage");
  const canSendNotice = hasPermission(user.role, "reports.view");
  const canViewCustomers = hasPermission(user.role, "customer.view") && hasPermission(user.role, "users.manage");

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name.split(" ")[0]}. Here's where things stand today, ${formatDate(new Date())}.`}
      />

      <div className="flex flex-col gap-8 p-4 sm:p-6">
        {(canManageFinance || canSendNotice || canCreateCustomer || canViewCustomers) && (
          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">What do you want to do?</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {canManageFinance && (
                <TaskTile title="A client paid money" help="Record the payment, then send them a receipt." icon={Wallet} href="/admin/sales/payments/new" />
              )}
              {canSendNotice && (
                <TaskTile title="Send a notice or receipt" help="Write a notice, or make a receipt or statement on your letterhead." icon={Megaphone} href="/admin/statements" />
              )}
              {canManageFinance && (
                <TaskTile title="New budget for everyone" help="Split a cost across all the owners of a project." icon={SplitSquareVertical} href="/admin/finance/cost-allocations/new" />
              )}
              {canViewCustomers && (
                <TaskTile title="Copy a client's login link" help="Each client gets their own link to send on WhatsApp — no login needed." icon={Link2} href="/admin/customers" />
              )}
              {canCreateCustomer && (
                <TaskTile title="Add a new client" help="Add the client first, then copy their link from the Customers list." icon={UserPlus} href="/admin/customers/new" />
              )}
              {canManageConstruction && (
                <TaskTile title="Update construction progress" help="Mark a stage as moved forward or delayed." icon={HardHat} href="/admin/construction" />
              )}
            </div>
          </section>
        )}

        {alerts.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-label text-fg-subtle uppercase">
                Urgent — {summarizeAlerts(alerts).critical + summarizeAlerts(alerts).high} needing attention
              </h2>
              <Link href="/admin/alerts" className="text-caption text-accent hover:text-accent-strong flex items-center gap-1 transition-colors">
                View all alerts <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {alerts
                .filter((a) => a.priority === "critical" || a.priority === "high")
                .slice(0, 5)
                .map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="border-border bg-surface-raised flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-fg-subtle"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={alert.priority} />
                      <p className="text-body-sm text-fg">{alert.title}</p>
                    </div>
                    <p className="text-caption text-fg-subtle">{alert.description}</p>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {todaysReminders.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-label text-fg-subtle uppercase">Today — {todaysReminders.length} reminder{todaysReminders.length === 1 ? "" : "s"}</h2>
              <Link href="/admin/reminders" className="text-caption text-accent hover:text-accent-strong flex items-center gap-1 transition-colors">
                View all reminders <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {todaysReminders.slice(0, 5).map((r) => (
                <div key={r.id} className="border-border bg-surface-raised flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.priority} />
                    <p className="text-body-sm text-fg">{r.title}</p>
                  </div>
                  <p className="text-caption text-fg-subtle">{formatDate(new Date(r.date))}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <DashboardSection title="Company Overview">
          <Link href="/admin/projects" className="block">
            <KpiCard
              label="Total Projects"
              value={data.totalProjects.value}
              emptyLabel="No projects yet"
              description={data.totalProjects.value === 0 ? "Create your first project to see it here." : `${data.activeProjects.value} active · ${data.completedProjects.value} completed`}
            />
          </Link>
          <Link href="/admin/properties" className="block">
            <KpiCard label="Total Units" value={data.totalUnits.value} description={`${data.assignedUnits.value ?? 0} assigned · ${data.availableUnits.value ?? 0} available`} />
          </Link>
          <Link href="/admin/customers" className="block">
            <KpiCard label="Total Owners" value={data.totalOwners.value} />
          </Link>
          <Link href="/admin/parking" className="block">
            <KpiCard label="Parking" value={data.totalParking.value} description={`${data.assignedParking.value ?? 0} assigned`} />
          </Link>
        </DashboardSection>

        <DashboardSection title="Financial Overview">
          <Link href="/admin/finance/reports/owner-contributions" className="block">
            <KpiCard label="Expected Collections" value={data.expectedCollections.value} formatValue={formatBDT} />
          </Link>
          <Link href="/admin/finance/reports/owner-contributions" className="block">
            <KpiCard label="Collected" value={data.collected.value} formatValue={formatBDT} />
          </Link>
          <Link href="/admin/finance/reports/owner-contributions" className="block">
            <KpiCard
              label="Outstanding"
              value={data.outstanding.value}
              formatValue={formatBDT}
              status={(data.outstanding.value ?? 0) > 0 ? "warning" : "success"}
            />
          </Link>
          <Link href="/admin/finance/reports/owner-contributions" className="block">
            <KpiCard
              label="Overdue Amount"
              value={data.overdueAmount.value}
              formatValue={formatBDT}
              status={(data.overdueAmount.value ?? 0) > 0 ? "error" : "success"}
            />
          </Link>
          <Link href="/admin/finance/expenses" className="block">
            <KpiCard label="Project Expenses" value={data.projectExpenses.value} formatValue={formatBDT} />
          </Link>
          <Link href="/admin/procurement/purchases" className="block">
            <KpiCard label="Material Cost" value={data.materialCost.value} formatValue={formatBDT} />
          </Link>
          <Link href="/admin/finance/reports/contractor-payments" className="block">
            <KpiCard label="Contractor Cost" value={data.contractorCost.value} formatValue={formatBDT} />
          </Link>
          <Link href="/admin/finance/project-costs" className="col-span-2 block sm:col-span-1">
            <KpiCard
              label="Budget vs Actual"
              value={data.totalBudget.value}
              formatValue={() => `${formatBDT(data.actualCost.value ?? 0)} / ${formatBDT(data.totalBudget.value ?? 0)}`}
              status={(data.actualCost.value ?? 0) > (data.totalBudget.value ?? 0) ? "warning" : "success"}
            />
          </Link>
        </DashboardSection>

        <DashboardSection title="Construction">
          <Link href="/admin/construction" className="block">
            <KpiCard label="Active Projects" value={data.constructionActiveProjects.value} />
          </Link>
          <Link href="/admin/construction" className="block">
            <KpiCard label="Overall Progress" value={data.averageConstructionProgress.value} formatValue={(v) => `${v}%`} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Delayed Stages" value={data.delayedPhases.value} status={(data.delayedPhases.value ?? 0) > 0 ? "error" : "success"} />
          </Link>
          <KpiCard label="Upcoming Milestones" value={data.upcomingMilestones.value} />
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Overdue Tasks" value={data.overdueTasks.value} status={(data.overdueTasks.value ?? 0) > 0 ? "warning" : "success"} />
          </Link>
        </DashboardSection>

        <DashboardSection title="Sales">
          <Link href="/admin/leads" className="block">
            <KpiCard label="Active Leads" value={data.leads.value} />
          </Link>
          <Link href="/admin/sales/bookings" className="block">
            <KpiCard label="Active Bookings" value={data.activeBookings.value} />
          </Link>
          <Link href="/admin/sales" className="block">
            <KpiCard label="Completed Sales" value={data.completedSales.value} />
          </Link>
          <Link href="/admin/sales" className="block">
            <KpiCard label="Pending Sales" value={data.pendingSales.value} />
          </Link>
          <Link href="/admin/properties" className="block">
            <KpiCard label="Available Units" value={data.availableUnits.value} />
          </Link>
          <Link href="/admin/sales/reports" className="block">
            <KpiCard label="Sales Value" value={data.salesValue.value} formatValue={formatBDT} />
          </Link>
        </DashboardSection>

        <DashboardSection title="Inventory">
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Low Stock" value={data.lowStockMaterials.value} status={(data.lowStockMaterials.value ?? 0) > 0 ? "warning" : "success"} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Out of Stock" value={data.outOfStockMaterials.value} status={(data.outOfStockMaterials.value ?? 0) > 0 ? "error" : "success"} />
          </Link>
          <Link href="/admin/procurement/purchases" className="block">
            <KpiCard label="Recent Purchases" value={data.recentPurchases.value} description="Last 7 days" />
          </Link>
          <Link href="/admin/procurement/stock" className="block">
            <KpiCard label="Recent Usage" value={data.recentUsage.value} description="Last 7 days" />
          </Link>
        </DashboardSection>

        <DashboardSection title="Documents">
          <Link href="/admin/documents" className="block">
            <KpiCard label="Total Documents" value={data.totalDocuments.value} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Expiring Soon" value={data.documentsExpiringSoon.value} status={(data.documentsExpiringSoon.value ?? 0) > 0 ? "warning" : "success"} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Expired" value={data.documentsExpired.value} status={(data.documentsExpired.value ?? 0) > 0 ? "error" : "success"} />
          </Link>
        </DashboardSection>

        <DashboardSection title="Alerts">
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Critical" value={data.criticalAlerts.value} status={(data.criticalAlerts.value ?? 0) > 0 ? "error" : "success"} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="High" value={data.highAlerts.value} status={(data.highAlerts.value ?? 0) > 0 ? "warning" : "success"} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Medium" value={data.mediumAlerts.value} />
          </Link>
          <Link href="/admin/alerts" className="block">
            <KpiCard label="Low" value={data.lowAlerts.value} />
          </Link>
        </DashboardSection>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Recent Activity</h2>
            <div className="border-border bg-surface-raised rounded-lg border p-2 sm:p-4">
              <RecentActivity activity={activity} />
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Website Content</h2>
            <div className="border-border bg-surface-raised flex flex-col gap-1 rounded-lg border p-2">
              <QuickAction label="New Article" icon={Newspaper} href={canCreateContent ? "/admin/content/news/new" : undefined} comingSoon={!canCreateContent} />
              <QuickAction label="Add Photos to Gallery" icon={Images} href={canCreateContent ? "/admin/content/gallery/bulk" : undefined} comingSoon={!canCreateContent} />
              <QuickAction label="New Website Project" icon={Building2} href={canCreateContent ? "/admin/content/projects/new" : undefined} comingSoon={!canCreateContent} />
              <QuickAction label="New Property" icon={PlusCircle} href={canCreateContent ? "/admin/content/properties/new" : undefined} comingSoon={!canCreateContent} />
              <QuickAction label="Add Properties in Bulk" icon={ListPlus} href={canCreateContent ? "/admin/content/properties/bulk" : undefined} comingSoon={!canCreateContent} />
              <QuickAction label="Add Team / Partner" icon={UserCog} href={canCreateContent ? "/admin/content/team/new" : undefined} comingSoon={!canCreateContent} />
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">More shortcuts</h2>
            <div className="border-border bg-surface-raised flex flex-col gap-1 rounded-lg border p-2">
              <QuickAction
                label="Add Project"
                icon={Building2}
                href={canCreateProject ? "/admin/projects/new" : undefined}
                comingSoon={!canCreateProject}
              />
              <QuickAction
                label="Add Unit"
                icon={PlusCircle}
                href={canManageUnits ? "/admin/properties/new" : undefined}
                comingSoon={!canManageUnits}
              />
              <QuickAction
                label="Review Enquiries"
                icon={UsersRound}
                href={canViewLeads ? "/admin/leads" : undefined}
                comingSoon={!canViewLeads}
              />
              <QuickAction
                label="Payments received so far"
                icon={ReceiptText}
                href={hasPermission(user.role, "finance.view") ? "/admin/sales/payments" : undefined}
                comingSoon={!hasPermission(user.role, "finance.view")}
              />
              <QuickAction
                label="Documents"
                icon={FileText}
                href={hasPermission(user.role, "documents.view") ? "/admin/documents" : undefined}
                comingSoon={!hasPermission(user.role, "documents.view")}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
