import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BackupPanel } from "@/components/admin/backup/BackupPanel";

/**
 * Disaster recovery in one place: download everything the admin panel
 * holds (or just the data, without images), and restore from a previous
 * download if something ever goes wrong. Gated on `settings.manage`, the
 * same permission the rest of system-level configuration uses.
 */
export default async function AdminBackupPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to back up or restore data." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Backup & Restore"}</AdminText>}
        description={<AdminText>{"Download a full copy of everything in this system, or restore from a previous backup."}</AdminText>}
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Backup & Restore", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <BackupPanel />
      </div>
    </>
  );
}
