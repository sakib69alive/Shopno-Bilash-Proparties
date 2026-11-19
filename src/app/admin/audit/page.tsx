import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AuditLogAdminExplorer } from "@/components/admin/audit/AuditLogAdminExplorer";
import { auditLogRepository } from "@/features/audit/repository";
import { userRepository } from "@/features/users/repository";
import { projectRepository } from "@/features/projects/repository";

/**
 * Audit Log — makes the append-only trail (`recordAuditEvent`, recorded
 * since Admin Step 3) actually visible. The data already existed; only the
 * Dashboard's last-few-events widget surfaced any of it before this page.
 * Gated on `audit.view` (already in `ROLE_PERMISSIONS` for the apex roles
 * only — no permission changes needed).
 */
export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "audit.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view the Audit Log." />
      </div>
    );
  }

  let entries, users, projects;
  try {
    [entries, users, projects] = await Promise.all([auditLogRepository.list(), userRepository.list(), projectRepository.list()]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="The audit log couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Audit Log"}</AdminText>} description={<AdminText>{"Every login and every content change, in order."}</AdminText>} />
      <div className="p-4 sm:p-6">
        <AuditLogAdminExplorer entries={entries} users={users} projects={projects} />
      </div>
    </>
  );
}
