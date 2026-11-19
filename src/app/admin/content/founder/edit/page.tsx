import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FounderProfileForm } from "@/components/admin/settings/FounderProfileForm";
import { updateFounderProfile } from "@/features/founderProfile/actions";
import { founderProfileRepository, FOUNDER_PROFILE_ID } from "@/features/founderProfile/repository";

export default async function EditFounderProfilePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit the Founder Profile." />
      </div>
    );
  }

  const profile = await founderProfileRepository.findById(FOUNDER_PROFILE_ID);
  if (!profile) notFound();

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Edit Founder Profile"}</AdminText>} breadcrumbs={[{ label: "Founder Profile", href: "/admin/content/founder" }, { label: "Edit", localize: true }]} />
      <div className="p-4 sm:p-6">
        <FounderProfileForm action={updateFounderProfile} profile={profile} />
      </div>
    </>
  );
}
