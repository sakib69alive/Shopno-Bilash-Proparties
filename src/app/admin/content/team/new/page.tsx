import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeamMemberForm } from "@/components/admin/team/TeamMemberForm";
import { createTeamMember } from "@/features/teamMembers/actions";

export default async function NewTeamMemberPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add Team & Partners content." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="New Team Member"
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Team & Partners", href: "/admin/content/team" },
          { label: "New" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <TeamMemberForm action={createTeamMember} submitLabel="Publish Team Member" />
      </div>
    </>
  );
}
