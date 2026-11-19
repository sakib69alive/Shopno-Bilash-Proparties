import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminGuideExplorer } from "@/components/admin/guide/AdminGuideExplorer";
import { ADMIN_GUIDE } from "@/content/adminGuide";

/**
 * The in-app user manual — every section mirrors `ADMIN_NAV_GROUPS`
 * (`config/navigation.ts`) and explains what that page does and how to
 * use it, so a new staff member (or anyone unfamiliar with the system)
 * can read this once and operate the platform. No special permission
 * gate beyond being signed in — filtered to what `user`'s role can
 * actually reach, same as the sidebar itself, so nobody reads
 * instructions for a page they can't open.
 */
export default async function AdminHelpPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const visibleGuide = ADMIN_GUIDE.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(user.role, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Help & Documentation"}</AdminText>}
        description={<AdminText>{"What every section of this Admin Panel does, and how to use it — your reference for running the whole platform."}</AdminText>}
      />
      <div className="p-4 sm:p-6">
        <AdminGuideExplorer groups={visibleGuide} />
      </div>
    </>
  );
}
