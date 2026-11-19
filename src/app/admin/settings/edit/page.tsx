import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { updateCompanySettings } from "@/features/settings/actions";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";

export default async function EditSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "settings.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Settings." />
      </div>
    );
  }

  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  if (!settings) notFound();

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Edit Settings"}</AdminText>} breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Edit", localize: true }]} />
      <div className="p-4 sm:p-6">
        <SettingsForm action={updateCompanySettings} settings={settings} />
      </div>
    </>
  );
}
