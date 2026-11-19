import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ApprovalQueueExplorer } from "@/components/admin/approvals/ApprovalQueueExplorer";
import { getApprovalQueue } from "@/features/approvals/queue";
import { projectRepository } from "@/features/projects/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "approvals.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view the Approval Queue." />
      </div>
    );
  }

  let items, projects;
  try {
    const [queueItems, allProjects] = await Promise.all([getApprovalQueue(user), projectRepository.list()]);
    items = queueItems;
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="The approval queue couldn't be loaded. Please try again." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Approval Queue"}</AdminText>}
        description={<AdminText>{"Ownership transfers, expenses, and contractor payments waiting on a decision."}</AdminText>}
      />
      <div className="p-4 sm:p-6">
        <ApprovalQueueExplorer items={items} projects={projects} canManage={hasPermission(user.role, "approvals.manage")} />
      </div>
    </>
  );
}
