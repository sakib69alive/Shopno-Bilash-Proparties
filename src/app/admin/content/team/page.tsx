import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { TeamMemberAdminGrid } from "@/components/admin/team/TeamMemberAdminGrid";
import { listTeamMembersOrdered } from "@/features/teamMembers/repository";

export default async function AdminTeamListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage the Team & Partners list." />
      </div>
    );
  }

  const members = await listTeamMembersOrdered();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Team & Partners"}</AdminText>}
        description={<AdminText>{"Partners, shareholders and team members shown with the Founder on the public Founder page, in the order added. Each person's Group decides which tab they appear under."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Team & Partners", localize: true }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/team/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Team Member"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <TeamMemberAdminGrid members={members} canDelete={canDelete} />
      </div>
    </>
  );
}
