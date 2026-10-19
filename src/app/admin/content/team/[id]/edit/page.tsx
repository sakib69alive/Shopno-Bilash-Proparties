import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeamMemberForm } from "@/components/admin/team/TeamMemberForm";
import { updateTeamMember } from "@/features/teamMembers/actions";
import { teamMemberRepository } from "@/features/teamMembers/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTeamMemberPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Team & Partners content." />
      </div>
    );
  }

  const member = await teamMemberRepository.findById(id);
  if (!member) notFound();

  const boundAction = updateTeamMember.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={member.name}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Team & Partners", href: "/admin/content/team" },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <TeamMemberForm action={boundAction} member={member} submitLabel="Save Changes" />
      </div>
    </>
  );
}
