import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShareholderForm } from "@/components/admin/shareholders/ShareholderForm";
import { createShareholder } from "@/features/shareholders/shareholderActions";

export default async function NewShareholderPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a shareholder." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Shareholder"}</AdminText>} breadcrumbs={[{ label: "Shareholders", href: "/admin/shareholders" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ShareholderForm action={createShareholder} submitLabel="Add Shareholder" />
      </div>
    </>
  );
}
