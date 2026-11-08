import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DemoDataPanel } from "@/components/admin/backup/DemoDataPanel";

/** Clears the practice data so the company can start with real records. Super Admin only — the most destructive page in the panel. */
export default async function AdminDemoDataPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin" || !hasPermission(user.role, "settings.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="Only a Super Admin can remove all data." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Remove demo data"
        description="Clear the practice data so you can start with your real business."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Remove demo data" }]}
      />
      <div className="p-4 sm:p-6">
        <DemoDataPanel />
      </div>
    </>
  );
}
