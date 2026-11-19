import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MilestoneForm } from "@/components/admin/story/MilestoneForm";
import { createMilestone } from "@/features/companyMilestones/actions";

export default async function NewMilestonePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a Story entry." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Entry"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Our Story", href: "/admin/content/story" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <MilestoneForm action={createMilestone} submitLabel="Publish Entry" />
      </div>
    </>
  );
}
