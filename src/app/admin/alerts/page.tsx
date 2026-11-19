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
import { StatusBadge } from "@/components/ui/Badge";
import { computeSystemAlerts, summarizeAlerts } from "@/features/alerts/engine";
import { projectRepository } from "@/features/projects/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

const CATEGORY_LABELS: Record<string, string> = {
  finance: "Finance",
  construction: "Construction",
  sales: "Sales",
  crm: "CRM",
  document: "Document",
  inventory: "Inventory",
  system: "System",
  security: "Security",
  approval: "Approval",
  reminder: "Reminder",
};

/** Prompt 9 §3/§15 — the Smart Alert Engine's UI, grouped by priority (never everything red — only "critical" reads as an emergency). */
export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "alerts.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view alerts." />
      </div>
    );
  }

  let alerts, projects;
  try {
    [alerts, projects] = await Promise.all([computeSystemAlerts(user), projectRepository.list().then((p) => filterVisibleProjectsList(user, p))]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Alerts couldn't be loaded. Please try again." />
      </div>
    );
  }

  const summary = summarizeAlerts(alerts);
  const projectsById = new Map(projects.map((p) => [p.id, p.name]));

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Alerts"}</AdminText>} description={<AdminText>{"Live issues surfaced from real data — never a stored, staleable list."}</AdminText>} />
      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <DashboardSection title="Summary">
          <KpiCard label="Critical" value={summary.critical} status={summary.critical > 0 ? "error" : "success"} />
          <KpiCard label="High" value={summary.high} status={summary.high > 0 ? "warning" : "success"} />
          <KpiCard label="Medium" value={summary.medium} />
          <KpiCard label="Low" value={summary.low} />
        </DashboardSection>

        {alerts.length === 0 ? (
          <EmptyState title="Nothing needs attention" description="No overdue installments, delays, low stock, or other issues right now." />
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="border-border bg-surface-raised flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:border-fg-subtle"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={alert.priority} />
                  <div>
                    <p className="text-body-sm text-fg font-medium">{alert.title}</p>
                    <p className="text-caption text-fg-subtle">
                      {alert.description}
                      {alert.projectId && projectsById.get(alert.projectId) ? ` · ${projectsById.get(alert.projectId)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-caption text-fg-subtle shrink-0">{CATEGORY_LABELS[alert.category] ?? alert.category}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
